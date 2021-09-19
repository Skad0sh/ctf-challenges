// 
// Decompiled by Procyon v0.5.36
// 

package com.fword.services;

import java.io.InvalidClassException;
import java.util.regex.Pattern;
import java.io.ObjectStreamClass;
import java.io.IOException;
import java.io.InputStream;
import java.io.ObjectInputStream;

public class Security extends ObjectInputStream
{
    public Security(final InputStream inputStream) throws IOException {
        super(inputStream);
    }
    
    @Override
    protected Class<?> resolveClass(final ObjectStreamClass desc) throws IOException, ClassNotFoundException {
        if (!Pattern.matches("(com\\.fword\\.(.*))|(java\\.util\\.(.*))|(java\\.time\\.(.*))", desc.getName())) {
            throw new InvalidClassException("Unauthorized deserialization attempt", desc.getName());
        }
        return super.resolveClass(desc);
    }
}
