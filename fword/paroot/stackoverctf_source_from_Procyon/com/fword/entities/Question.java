// 
// Decompiled by Procyon v0.5.36
// 

package com.fword.entities;

import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.persistence.Entity;
import java.io.Serializable;

@Entity
@Table(name = "questions", schema = "stackctf", catalog = "")
public class Question implements Serializable
{
    private int id;
    private String question_field;
    private String category;
    private String anime;
    
    public Question(final String question_field, final String category, final String anime) {
        this.question_field = question_field;
        this.category = category;
        this.anime = anime;
    }
    
    @Id
    @Column(name = "id")
    public int getId() {
        return this.id;
    }
    
    public void setId(final int id) {
        this.id = id;
    }
    
    @Basic
    @Column(name = "question")
    public String getQuestion() {
        return this.question_field;
    }
    
    public void setQuestion(final String question) {
        this.question_field = this.question_field;
    }
    
    @Basic
    @Column(name = "category")
    public String getCategory() {
        return this.category;
    }
    
    public void setCategory(final String category) {
        this.category = category;
    }
    
    @Basic
    @Column(name = "anime")
    public String getAnime() {
        return this.anime;
    }
    
    public void setAnime(final String anime) {
        this.anime = anime;
    }
    
    @Override
    public boolean equals(final Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || this.getClass() != o.getClass()) {
            return false;
        }
        final Question that = (Question)o;
        if (this.id != that.id) {
            return false;
        }
        Label_0075: {
            if (this.question_field != null) {
                if (this.question_field.equals(that.question_field)) {
                    break Label_0075;
                }
            }
            else if (that.question_field == null) {
                break Label_0075;
            }
            return false;
        }
        Label_0108: {
            if (this.category != null) {
                if (this.category.equals(that.category)) {
                    break Label_0108;
                }
            }
            else if (that.category == null) {
                break Label_0108;
            }
            return false;
        }
        if (this.anime != null) {
            if (this.anime.equals(that.anime)) {
                return true;
            }
        }
        else if (that.anime == null) {
            return true;
        }
        return false;
    }
    
    @Override
    public int hashCode() {
        int result = this.id;
        result = 31 * result + ((this.question_field != null) ? this.question_field.hashCode() : 0);
        result = 31 * result + ((this.category != null) ? this.category.hashCode() : 0);
        result = 31 * result + ((this.anime != null) ? this.anime.hashCode() : 0);
        return result;
    }
}
