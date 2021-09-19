// 
// Decompiled by Procyon v0.5.36
// 

package com.fword.controllers;

import javax.servlet.http.Cookie;
import java.io.OutputStream;
import java.io.ObjectOutputStream;
import java.io.ByteArrayOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestMapping;
import java.io.IOException;
import com.fword.entities.Question;
import java.io.InputStream;
import com.fword.services.Security;
import java.io.ByteArrayInputStream;
import java.util.Base64;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.beans.factory.annotation.Autowired;
import com.fword.services.QuestionService;
import org.springframework.stereotype.Controller;

@Controller
public class QuestionController
{
    private QuestionService questionService;
    
    @Autowired
    public void setQuestionService(final QuestionService questionService) {
        this.questionService = questionService;
    }
    
    @RequestMapping(value = { "/latest_question" }, method = { RequestMethod.GET })
    public String list(@CookieValue(value = "latest_question", defaultValue = "") final String latest_question, final Model model) {
        if (latest_question.length() == 0) {
            model.addAttribute("latest_question", (Object)"No recent question detected");
        }
        else {
            try {
                final byte[] decodedBytes = Base64.getDecoder().decode(latest_question);
                final ByteArrayInputStream in = new ByteArrayInputStream(decodedBytes);
                final Security inp = new Security(in);
                Question result = null;
                result = (Question)inp.readObject();
                model.addAttribute("latest_question", (Object)result.getQuestion());
            }
            catch (IllegalArgumentException ex) {
                model.addAttribute("latest_question", (Object)"An Error has occured");
                ex.printStackTrace();
            }
            catch (IOException e) {
                model.addAttribute("latest_question", (Object)"An Error has occured");
                e.printStackTrace();
            }
            catch (ClassNotFoundException e2) {
                model.addAttribute("latest_question", (Object)"An Error has occured");
                e2.printStackTrace();
            }
        }
        return "questions";
    }
    
    @RequestMapping({ "question/new" })
    public String newQuestion(final Model model) {
        return "questionform";
    }
    
    @RequestMapping(value = { "question" }, method = { RequestMethod.POST })
    public String saveQuestion(final HttpServletResponse response, final HttpServletRequest req) {
        final Question question = new Question(req.getParameter("question"), req.getParameter("category"), req.getParameter("anime"));
        this.questionService.saveQuestion(question);
        final ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        try {
            final ObjectOutputStream objectOutputStream = new ObjectOutputStream(byteArrayOutputStream);
            objectOutputStream.writeObject(question);
            objectOutputStream.close();
            final String cookie = Base64.getEncoder().encodeToString(byteArrayOutputStream.toByteArray());
            final Cookie latest_question = new Cookie("latest_question", cookie);
            response.addCookie(latest_question);
        }
        catch (IOException e) {
            final Cookie latest_question = new Cookie("latest_question", "");
            e.printStackTrace();
            response.addCookie(latest_question);
        }
        return "redirect:/latest_question";
    }
}
