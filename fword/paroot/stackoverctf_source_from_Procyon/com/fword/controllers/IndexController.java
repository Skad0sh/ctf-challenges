// 
// Decompiled by Procyon v0.5.36
// 

package com.fword.controllers;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.stereotype.Controller;

@Controller
public class IndexController
{
    @RequestMapping({ "/" })
    String index() {
        return "index";
    }
}
