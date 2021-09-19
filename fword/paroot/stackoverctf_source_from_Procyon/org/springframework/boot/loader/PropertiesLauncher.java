// 
// Decompiled by Procyon v0.5.36
// 

package org.springframework.boot.loader;

import java.net.MalformedURLException;
import java.util.regex.Matcher;
import org.springframework.boot.loader.archive.JarFileArchive;
import java.util.Collection;
import java.util.jar.Manifest;
import org.springframework.boot.loader.archive.ExplodedArchive;
import java.net.URLConnection;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.Iterator;
import java.io.InputStream;
import java.util.Collections;
import org.springframework.boot.loader.util.SystemPropertyUtils;
import java.util.ArrayList;
import org.springframework.boot.loader.archive.Archive;
import java.util.Properties;
import java.util.List;
import java.io.File;
import java.util.regex.Pattern;

public class PropertiesLauncher extends Launcher
{
    private static final String DEBUG = "loader.debug";
    public static final String MAIN = "loader.main";
    public static final String PATH = "loader.path";
    public static final String HOME = "loader.home";
    public static final String ARGS = "loader.args";
    public static final String CONFIG_NAME = "loader.config.name";
    public static final String CONFIG_LOCATION = "loader.config.location";
    public static final String SET_SYSTEM_PROPERTIES = "loader.system";
    private static final Pattern WORD_SEPARATOR;
    private final File home;
    private List<String> paths;
    private final Properties properties;
    private Archive parent;
    
    public PropertiesLauncher() {
        this.paths = new ArrayList<String>();
        this.properties = new Properties();
        try {
            this.initializeProperties(this.home = this.getHomeDirectory());
            this.initializePaths();
            this.parent = this.createArchive();
        }
        catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
    
    protected File getHomeDirectory() {
        return new File(SystemPropertyUtils.resolvePlaceholders(System.getProperty("loader.home", "${user.dir}")));
    }
    
    private void initializeProperties(final File home) throws Exception, IOException {
        String config = "classpath:BOOT-INF/classes/" + SystemPropertyUtils.resolvePlaceholders(SystemPropertyUtils.getProperty("loader.config.name", "application")) + ".properties";
        config = SystemPropertyUtils.resolvePlaceholders(SystemPropertyUtils.getProperty("loader.config.location", config));
        final InputStream resource = this.getResource(config);
        if (resource != null) {
            this.log("Found: " + config);
            try {
                this.properties.load(resource);
            }
            finally {
                resource.close();
            }
            for (final Object key : Collections.list(this.properties.propertyNames())) {
                final String text = this.properties.getProperty((String)key);
                final String value = SystemPropertyUtils.resolvePlaceholders(this.properties, text);
                if (value != null) {
                    this.properties.put(key, value);
                }
            }
            if (SystemPropertyUtils.resolvePlaceholders("${loader.system:false}").equals("true")) {
                this.log("Adding resolved properties to System properties");
                for (final Object key : Collections.list(this.properties.propertyNames())) {
                    final String value2 = this.properties.getProperty((String)key);
                    System.setProperty((String)key, value2);
                }
            }
        }
        else {
            this.log("Not found: " + config);
        }
    }
    
    private InputStream getResource(String config) throws Exception {
        if (config.startsWith("classpath:")) {
            return this.getClasspathResource(config.substring("classpath:".length()));
        }
        config = this.stripFileUrlPrefix(config);
        if (this.isUrl(config)) {
            return this.getURLResource(config);
        }
        return this.getFileResource(config);
    }
    
    private String stripFileUrlPrefix(String config) {
        if (config.startsWith("file:")) {
            config = config.substring("file:".length());
            if (config.startsWith("//")) {
                config = config.substring(2);
            }
        }
        return config;
    }
    
    private boolean isUrl(final String config) {
        return config.contains("://");
    }
    
    private InputStream getClasspathResource(String config) {
        while (config.startsWith("/")) {
            config = config.substring(1);
        }
        config = "/" + config;
        this.log("Trying classpath: " + config);
        return this.getClass().getResourceAsStream(config);
    }
    
    private InputStream getFileResource(final String config) throws Exception {
        final File file = new File(config);
        this.log("Trying file: " + config);
        if (file.canRead()) {
            return new FileInputStream(file);
        }
        return null;
    }
    
    private InputStream getURLResource(final String config) throws Exception {
        final URL url = new URL(config);
        if (this.exists(url)) {
            final URLConnection con = url.openConnection();
            try {
                return con.getInputStream();
            }
            catch (IOException ex) {
                if (con instanceof HttpURLConnection) {
                    ((HttpURLConnection)con).disconnect();
                }
                throw ex;
            }
        }
        return null;
    }
    
    private boolean exists(final URL url) throws IOException {
        final URLConnection connection = url.openConnection();
        try {
            connection.setUseCaches(connection.getClass().getSimpleName().startsWith("JNLP"));
            if (connection instanceof HttpURLConnection) {
                final HttpURLConnection httpConnection = (HttpURLConnection)connection;
                httpConnection.setRequestMethod("HEAD");
                final int responseCode = httpConnection.getResponseCode();
                if (responseCode == 200) {
                    return true;
                }
                if (responseCode == 404) {
                    return false;
                }
            }
            return connection.getContentLength() >= 0;
        }
        finally {
            if (connection instanceof HttpURLConnection) {
                ((HttpURLConnection)connection).disconnect();
            }
        }
    }
    
    private void initializePaths() throws IOException {
        String path = SystemPropertyUtils.getProperty("loader.path");
        if (path == null) {
            path = this.properties.getProperty("loader.path");
        }
        if (path != null) {
            this.paths = this.parsePathsProperty(SystemPropertyUtils.resolvePlaceholders(path));
        }
        this.log("Nested archive paths: " + this.paths);
    }
    
    private List<String> parsePathsProperty(final String commaSeparatedPaths) {
        final List<String> paths = new ArrayList<String>();
        for (String path : commaSeparatedPaths.split(",")) {
            path = this.cleanupPath(path);
            if (!path.equals("")) {
                paths.add(path);
            }
        }
        if (paths.isEmpty()) {
            paths.add("lib");
        }
        return paths;
    }
    
    protected String[] getArgs(String... args) throws Exception {
        final String loaderArgs = this.getProperty("loader.args");
        if (loaderArgs != null) {
            final String[] defaultArgs = loaderArgs.split("\\s+");
            final String[] additionalArgs = args;
            args = new String[defaultArgs.length + additionalArgs.length];
            System.arraycopy(defaultArgs, 0, args, 0, defaultArgs.length);
            System.arraycopy(additionalArgs, 0, args, defaultArgs.length, additionalArgs.length);
        }
        return args;
    }
    
    @Override
    protected String getMainClass() throws Exception {
        final String mainClass = this.getProperty("loader.main", "Start-Class");
        if (mainClass == null) {
            throw new IllegalStateException("No 'loader.main' or 'Start-Class' specified");
        }
        return mainClass;
    }
    
    @Override
    protected ClassLoader createClassLoader(final List<Archive> archives) throws Exception {
        ClassLoader loader = super.createClassLoader(archives);
        final String customLoaderClassName = this.getProperty("loader.classLoader");
        if (customLoaderClassName != null) {
            loader = this.wrapWithCustomClassLoader(loader, customLoaderClassName);
            this.log("Using custom class loader: " + customLoaderClassName);
        }
        return loader;
    }
    
    private ClassLoader wrapWithCustomClassLoader(final ClassLoader parent, final String loaderClassName) throws Exception {
        final Class<ClassLoader> loaderClass = (Class<ClassLoader>)Class.forName(loaderClassName, true, parent);
        try {
            return loaderClass.getConstructor(ClassLoader.class).newInstance(parent);
        }
        catch (NoSuchMethodException ex) {
            try {
                return loaderClass.getConstructor(URL[].class, ClassLoader.class).newInstance(new URL[0], parent);
            }
            catch (NoSuchMethodException ex2) {
                return loaderClass.newInstance();
            }
        }
    }
    
    private String getProperty(final String propertyKey) throws Exception {
        return this.getProperty(propertyKey, null);
    }
    
    private String getProperty(final String propertyKey, String manifestKey) throws Exception {
        if (manifestKey == null) {
            manifestKey = propertyKey.replace(".", "-");
            manifestKey = toCamelCase(manifestKey);
        }
        final String property = SystemPropertyUtils.getProperty(propertyKey);
        if (property != null) {
            final String value = SystemPropertyUtils.resolvePlaceholders(property);
            this.log("Property '" + propertyKey + "' from environment: " + value);
            return value;
        }
        if (this.properties.containsKey(propertyKey)) {
            final String value = SystemPropertyUtils.resolvePlaceholders(this.properties.getProperty(propertyKey));
            this.log("Property '" + propertyKey + "' from properties: " + value);
            return value;
        }
        try {
            final Manifest manifest = new ExplodedArchive(this.home, false).getManifest();
            if (manifest != null) {
                final String value2 = manifest.getMainAttributes().getValue(manifestKey);
                this.log("Property '" + manifestKey + "' from home directory manifest: " + value2);
                return value2;
            }
        }
        catch (IllegalStateException ex) {}
        final Manifest manifest = this.createArchive().getManifest();
        if (manifest != null) {
            final String value2 = manifest.getMainAttributes().getValue(manifestKey);
            if (value2 != null) {
                this.log("Property '" + manifestKey + "' from archive manifest: " + value2);
                return value2;
            }
        }
        return null;
    }
    
    @Override
    protected List<Archive> getClassPathArchives() throws Exception {
        final List<Archive> lib = new ArrayList<Archive>();
        for (final String path : this.paths) {
            for (final Archive archive : this.getClassPathArchives(path)) {
                if (archive instanceof ExplodedArchive) {
                    final List<Archive> nested = new ArrayList<Archive>(archive.getNestedArchives(new ArchiveEntryFilter()));
                    nested.add(0, archive);
                    lib.addAll(nested);
                }
                else {
                    lib.add(archive);
                }
            }
        }
        this.addNestedEntries(lib);
        return lib;
    }
    
    private List<Archive> getClassPathArchives(final String path) throws Exception {
        final String root = this.cleanupPath(this.stripFileUrlPrefix(path));
        final List<Archive> lib = new ArrayList<Archive>();
        File file = new File(root);
        if (!this.isAbsolutePath(root)) {
            file = new File(this.home, root);
        }
        if (file.isDirectory()) {
            this.log("Adding classpath entries from " + file);
            final Archive archive = new ExplodedArchive(file, false);
            lib.add(archive);
        }
        final Archive archive = this.getArchive(file);
        if (archive != null) {
            this.log("Adding classpath entries from archive " + archive.getUrl() + root);
            lib.add(archive);
        }
        final Archive nested = this.getNestedArchive(root);
        if (nested != null) {
            this.log("Adding classpath entries from nested " + nested.getUrl() + root);
            lib.add(nested);
        }
        return lib;
    }
    
    private boolean isAbsolutePath(final String root) {
        return root.contains(":") || root.startsWith("/");
    }
    
    private Archive getArchive(final File file) throws IOException {
        final String name = file.getName().toLowerCase();
        if (name.endsWith(".jar") || name.endsWith(".zip")) {
            return new JarFileArchive(file);
        }
        return null;
    }
    
    private Archive getNestedArchive(final String root) throws Exception {
        if (root.startsWith("/") || this.parent.getUrl().equals(this.home.toURI().toURL())) {
            return null;
        }
        final Archive.EntryFilter filter = new PrefixMatchingArchiveFilter(root);
        if (this.parent.getNestedArchives(filter).isEmpty()) {
            return null;
        }
        return new FilteredArchive(this.parent, filter);
    }
    
    private void addNestedEntries(final List<Archive> lib) {
        try {
            lib.addAll(this.parent.getNestedArchives(new Archive.EntryFilter() {
                @Override
                public boolean matches(final Archive.Entry entry) {
                    if (entry.isDirectory()) {
                        return entry.getName().startsWith("BOOT-INF/classes/");
                    }
                    return entry.getName().startsWith("BOOT-INF/lib/");
                }
            }));
        }
        catch (IOException ex) {}
    }
    
    private String cleanupPath(String path) {
        path = path.trim();
        if (path.startsWith("./")) {
            path = path.substring(2);
        }
        if (path.toLowerCase().endsWith(".jar") || path.toLowerCase().endsWith(".zip")) {
            return path;
        }
        if (path.endsWith("/*")) {
            path = path.substring(0, path.length() - 1);
        }
        else if (!path.endsWith("/") && !path.equals(".")) {
            path += "/";
        }
        return path;
    }
    
    public static void main(String[] args) throws Exception {
        final PropertiesLauncher launcher = new PropertiesLauncher();
        args = launcher.getArgs(args);
        launcher.launch(args);
    }
    
    public static String toCamelCase(final CharSequence string) {
        if (string == null) {
            return null;
        }
        final StringBuilder builder = new StringBuilder();
        final Matcher matcher = PropertiesLauncher.WORD_SEPARATOR.matcher(string);
        int pos = 0;
        while (matcher.find()) {
            builder.append(capitalize(string.subSequence(pos, matcher.end()).toString()));
            pos = matcher.end();
        }
        builder.append(capitalize(string.subSequence(pos, string.length()).toString()));
        return builder.toString();
    }
    
    private static Object capitalize(final String str) {
        final StringBuilder sb = new StringBuilder(str.length());
        sb.append(Character.toUpperCase(str.charAt(0)));
        sb.append(str.substring(1));
        return sb.toString();
    }
    
    private void log(final String message) {
        if (Boolean.getBoolean("loader.debug")) {
            System.out.println(message);
        }
    }
    
    static {
        WORD_SEPARATOR = Pattern.compile("\\W+");
    }
    
    private static final class PrefixMatchingArchiveFilter implements Archive.EntryFilter
    {
        private final String prefix;
        private final ArchiveEntryFilter filter;
        
        private PrefixMatchingArchiveFilter(final String prefix) {
            this.filter = new ArchiveEntryFilter();
            this.prefix = prefix;
        }
        
        @Override
        public boolean matches(final Archive.Entry entry) {
            return entry.getName().startsWith(this.prefix) && this.filter.matches(entry);
        }
    }
    
    private static final class ArchiveEntryFilter implements Archive.EntryFilter
    {
        private static final String DOT_JAR = ".jar";
        private static final String DOT_ZIP = ".zip";
        
        @Override
        public boolean matches(final Archive.Entry entry) {
            return entry.getName().endsWith(".jar") || entry.getName().endsWith(".zip");
        }
    }
    
    private static class FilteredArchive implements Archive
    {
        private final Archive parent;
        private final EntryFilter filter;
        
        FilteredArchive(final Archive parent, final EntryFilter filter) {
            this.parent = parent;
            this.filter = filter;
        }
        
        @Override
        public URL getUrl() throws MalformedURLException {
            return this.parent.getUrl();
        }
        
        @Override
        public Manifest getManifest() throws IOException {
            return this.parent.getManifest();
        }
        
        @Override
        public Iterator<Entry> iterator() {
            throw new UnsupportedOperationException();
        }
        
        @Override
        public List<Archive> getNestedArchives(final EntryFilter filter) throws IOException {
            return this.parent.getNestedArchives(new EntryFilter() {
                @Override
                public boolean matches(final Entry entry) {
                    return FilteredArchive.this.filter.matches(entry) && filter.matches(entry);
                }
            });
        }
    }
}
