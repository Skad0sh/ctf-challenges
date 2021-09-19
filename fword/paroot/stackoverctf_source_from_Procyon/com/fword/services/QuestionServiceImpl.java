// 
// Decompiled by Procyon v0.5.36
// 

package com.fword.services;

import com.fword.entities.Question;
import org.springframework.beans.factory.annotation.Autowired;
import com.fword.repositories.QuestionRepository;
import org.springframework.stereotype.Service;

@Service
public class QuestionServiceImpl implements QuestionService
{
    private QuestionRepository QuestionRepository;
    
    @Autowired
    public void setQuestionRepository(final QuestionRepository QuestionRepository) {
        this.QuestionRepository = QuestionRepository;
    }
    
    public Question saveQuestion(final Question Question) {
        return (Question)this.QuestionRepository.save((Object)Question);
    }
}
