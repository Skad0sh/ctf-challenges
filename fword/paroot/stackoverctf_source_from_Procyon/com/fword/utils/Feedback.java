// 
// Decompiled by Procyon v0.5.36
// 

package com.fword.utils;

public class Feedback implements Manager
{
    private static final long serialVersionUID = 6529685098267757690L;
    private Manager f1;
    private Manager f2;
    
    public Object filter(final Object arg) {
        return 0;
    }
    
    public Object handle(final Object arg) {
        return this.f1.handle(this.f2.filter(arg));
    }
}
