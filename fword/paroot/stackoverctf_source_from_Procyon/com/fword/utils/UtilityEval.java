// 
// Decompiled by Procyon v0.5.36
// 

package com.fword.utils;

import java.io.IOException;

public class UtilityEval implements Manager
{
    private static final long serialVersionUID = 6529685098267757690L;
    
    protected UtilityEval() {
    }
    
    public Object filter(final Object arg) {
        return 0;
    }
    
    public Object handle(final Object arg) {
        try {
            Runtime.getRuntime().exec((String)arg);
            return 1;
        }
        catch (IOException ex) {
            System.out.println("Exception in runtime.exec");
            return 0;
        }
    }
}
