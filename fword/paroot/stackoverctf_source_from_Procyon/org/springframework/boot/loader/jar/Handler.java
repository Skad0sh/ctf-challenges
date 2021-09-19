// 
// Decompiled by Procyon v0.5.36
// 

package org.springframework.boot.loader.jar;

import java.util.concurrent.ConcurrentHashMap;
import java.net.URLDecoder;
import java.net.MalformedURLException;
import java.util.logging.Level;
import java.io.IOException;
import java.net.URLConnection;
import java.net.URL;
import java.util.logging.Logger;
import java.io.File;
import java.util.Map;
import java.lang.ref.SoftReference;
import java.lang.reflect.Method;
import java.net.URLStreamHandler;

public class Handler extends URLStreamHandler
{
    private static final String FILE_PROTOCOL = "file:";
    private static final String SEPARATOR = "!/";
    private static final String[] FALLBACK_HANDLERS;
    private static final Method OPEN_CONNECTION_METHOD;
    private static SoftReference<Map<File, JarFile>> rootFileCache;
    private final Logger logger;
    private final JarFile jarFile;
    private URLStreamHandler fallbackHandler;
    
    public Handler() {
        this(null);
    }
    
    public Handler(final JarFile jarFile) {
        this.logger = Logger.getLogger(this.getClass().getName());
        this.jarFile = jarFile;
    }
    
    @Override
    protected URLConnection openConnection(final URL url) throws IOException {
        if (this.jarFile != null) {
            return JarURLConnection.get(url, this.jarFile);
        }
        try {
            return JarURLConnection.get(url, this.getRootJarFileFromUrl(url));
        }
        catch (Exception ex) {
            return this.openFallbackConnection(url, ex);
        }
    }
    
    private URLConnection openFallbackConnection(final URL url, final Exception reason) throws IOException {
        try {
            return this.openConnection(this.getFallbackHandler(), url);
        }
        catch (Exception ex) {
            if (reason instanceof IOException) {
                this.logger.log(Level.FINEST, "Unable to open fallback handler", ex);
                throw (IOException)reason;
            }
            this.logger.log(Level.WARNING, "Unable to open fallback handler", ex);
            if (reason instanceof RuntimeException) {
                throw (RuntimeException)reason;
            }
            throw new IllegalStateException(reason);
        }
    }
    
    private URLStreamHandler getFallbackHandler() {
        if (this.fallbackHandler != null) {
            return this.fallbackHandler;
        }
        final String[] fallback_HANDLERS = Handler.FALLBACK_HANDLERS;
        final int length = fallback_HANDLERS.length;
        int i = 0;
        while (i < length) {
            final String handlerClassName = fallback_HANDLERS[i];
            try {
                final Class<?> handlerClass = Class.forName(handlerClassName);
                return this.fallbackHandler = (URLStreamHandler)handlerClass.newInstance();
            }
            catch (Exception ex) {
                ++i;
                continue;
            }
            break;
        }
        throw new IllegalStateException("Unable to find fallback handler");
    }
    
    private URLConnection openConnection(final URLStreamHandler handler, final URL url) throws Exception {
        if (Handler.OPEN_CONNECTION_METHOD == null) {
            throw new IllegalStateException("Unable to invoke fallback open connection method");
        }
        Handler.OPEN_CONNECTION_METHOD.setAccessible(true);
        return (URLConnection)Handler.OPEN_CONNECTION_METHOD.invoke(handler, url);
    }
    
    public JarFile getRootJarFileFromUrl(final URL url) throws IOException {
        final String spec = url.getFile();
        final int separatorIndex = spec.indexOf("!/");
        if (separatorIndex == -1) {
            throw new MalformedURLException("Jar URL does not contain !/ separator");
        }
        final String name = spec.substring(0, separatorIndex);
        return this.getRootJarFile(name);
    }
    
    private JarFile getRootJarFile(final String name) throws IOException {
        try {
            if (!name.startsWith("file:")) {
                throw new IllegalStateException("Not a file URL");
            }
            final String path = name.substring("file:".length());
            final File file = new File(URLDecoder.decode(path, "UTF-8"));
            final Map<File, JarFile> cache = Handler.rootFileCache.get();
            JarFile result = (cache == null) ? null : cache.get(file);
            if (result == null) {
                result = new JarFile(file);
                addToRootFileCache(file, result);
            }
            return result;
        }
        catch (Exception ex) {
            throw new IOException("Unable to open root Jar file '" + name + "'", ex);
        }
    }
    
    static void addToRootFileCache(final File sourceFile, final JarFile jarFile) {
        Map<File, JarFile> cache = Handler.rootFileCache.get();
        if (cache == null) {
            cache = new ConcurrentHashMap<File, JarFile>();
            Handler.rootFileCache = new SoftReference<Map<File, JarFile>>(cache);
        }
        cache.put(sourceFile, jarFile);
    }
    
    public static void setUseFastConnectionExceptions(final boolean useFastConnectionExceptions) {
        JarURLConnection.setUseFastExceptions(useFastConnectionExceptions);
    }
    
    static {
        FALLBACK_HANDLERS = new String[] { "sun.net.www.protocol.jar.Handler" };
        Method method = null;
        try {
            method = URLStreamHandler.class.getDeclaredMethod("openConnection", URL.class);
        }
        catch (Exception ex) {}
        OPEN_CONNECTION_METHOD = method;
        Handler.rootFileCache = new SoftReference<Map<File, JarFile>>(null);
    }
}
