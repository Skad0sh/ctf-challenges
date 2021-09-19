// 
// Decompiled by Procyon v0.5.36
// 

package com.fword.utils;

import java.util.Comparator;
import java.io.Serializable;

public class UserComparator implements Serializable, Comparator<User>
{
    private static final long serialVersionUID = 6529685098267757690L;
    private Question questionObj;
    
    @Override
    public int compare(final User o, final User ob) {
        if (this.questionObj.getCategory() != null) {
            final Manager m = this.questionObj.getCategory();
            return (int)m.handle((Object)this);
        }
        final Manager m = (Manager)new Category();
        return (int)m.handle((Object)this);
    }
}
