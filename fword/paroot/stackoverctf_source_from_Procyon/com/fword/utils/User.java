// 
// Decompiled by Procyon v0.5.36
// 

package com.fword.utils;

import java.io.Serializable;

public class User implements Serializable
{
    private static final long serialVersionUID = 6529685098267757690L;
    public String name;
    
    public User(final String entry) {
        this.name = entry;
    }
}
