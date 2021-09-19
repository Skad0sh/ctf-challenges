// 
// Decompiled by Procyon v0.5.36
// 

package org.springframework.boot.loader.jar;

import java.nio.charset.Charset;

final class AsciiBytes
{
    private static final Charset UTF_8;
    private final byte[] bytes;
    private final int offset;
    private final int length;
    private String string;
    private int hash;
    
    AsciiBytes(final String string) {
        this(string.getBytes(AsciiBytes.UTF_8));
        this.string = string;
    }
    
    AsciiBytes(final byte[] bytes) {
        this(bytes, 0, bytes.length);
    }
    
    AsciiBytes(final byte[] bytes, final int offset, final int length) {
        if (offset < 0 || length < 0 || offset + length > bytes.length) {
            throw new IndexOutOfBoundsException();
        }
        this.bytes = bytes;
        this.offset = offset;
        this.length = length;
    }
    
    public int length() {
        return this.length;
    }
    
    public boolean startsWith(final AsciiBytes prefix) {
        if (this == prefix) {
            return true;
        }
        if (prefix.length > this.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; ++i) {
            if (this.bytes[i + this.offset] != prefix.bytes[i + prefix.offset]) {
                return false;
            }
        }
        return true;
    }
    
    public boolean endsWith(final AsciiBytes postfix) {
        if (this == postfix) {
            return true;
        }
        if (postfix.length > this.length) {
            return false;
        }
        for (int i = 0; i < postfix.length; ++i) {
            if (this.bytes[this.offset + (this.length - 1) - i] != postfix.bytes[postfix.offset + (postfix.length - 1) - i]) {
                return false;
            }
        }
        return true;
    }
    
    public AsciiBytes substring(final int beginIndex) {
        return this.substring(beginIndex, this.length);
    }
    
    public AsciiBytes substring(final int beginIndex, final int endIndex) {
        final int length = endIndex - beginIndex;
        if (this.offset + length > this.bytes.length) {
            throw new IndexOutOfBoundsException();
        }
        return new AsciiBytes(this.bytes, this.offset + beginIndex, length);
    }
    
    public AsciiBytes append(final String string) {
        if (string == null || string.length() == 0) {
            return this;
        }
        return this.append(string.getBytes(AsciiBytes.UTF_8));
    }
    
    public AsciiBytes append(final AsciiBytes asciiBytes) {
        if (asciiBytes == null || asciiBytes.length() == 0) {
            return this;
        }
        return this.append(asciiBytes.bytes);
    }
    
    public AsciiBytes append(final byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return this;
        }
        final byte[] combined = new byte[this.length + bytes.length];
        System.arraycopy(this.bytes, this.offset, combined, 0, this.length);
        System.arraycopy(bytes, 0, combined, this.length, bytes.length);
        return new AsciiBytes(combined);
    }
    
    @Override
    public String toString() {
        if (this.string == null) {
            this.string = new String(this.bytes, this.offset, this.length, AsciiBytes.UTF_8);
        }
        return this.string;
    }
    
    @Override
    public int hashCode() {
        int hash = this.hash;
        if (hash == 0 && this.bytes.length > 0) {
            for (int i = this.offset; i < this.offset + this.length; ++i) {
                int b = this.bytes[i] & 0xFF;
                if (b > 127) {
                    for (int size = 0; size < 3; ++size) {
                        if ((b & 64 >> size) == 0x0) {
                            b &= 31 >> size;
                            for (int j = 0; j < size; ++j) {
                                b <<= 6;
                                b |= (this.bytes[++i] & 0x3F);
                            }
                            break;
                        }
                    }
                }
                hash = 31 * hash + b;
            }
            this.hash = hash;
        }
        return hash;
    }
    
    @Override
    public boolean equals(final Object obj) {
        if (obj == null) {
            return false;
        }
        if (this == obj) {
            return true;
        }
        if (obj.getClass().equals(AsciiBytes.class)) {
            final AsciiBytes other = (AsciiBytes)obj;
            if (this.length == other.length) {
                for (int i = 0; i < this.length; ++i) {
                    if (this.bytes[this.offset + i] != other.bytes[other.offset + i]) {
                        return false;
                    }
                }
                return true;
            }
        }
        return false;
    }
    
    static String toString(final byte[] bytes) {
        return new String(bytes, AsciiBytes.UTF_8);
    }
    
    public static int hashCode(final String string) {
        return string.hashCode();
    }
    
    public static int hashCode(int hash, final String string) {
        final char[] chars = string.toCharArray();
        for (int i = 0; i < chars.length; ++i) {
            hash = 31 * hash + chars[i];
        }
        return hash;
    }
    
    static {
        UTF_8 = Charset.forName("UTF-8");
    }
}
