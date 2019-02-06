'use strict';
const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');
const should = chai.should();
const expect = chai.expect;
const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');
chai.use(chaiHttp);




//put data in db
function seedBlogPostData(){
    console.info('seeding blogpost data');
    const seedData = [];
    for (let i = 0; i < 10; i++){
        seedData.push(generateBlogPostData());
    } 
    return BlogPost.insertMany(seedData);
}

//generate random blogposts with title, content, author
function generateBlogPostData(){
    return {
        title: faker.lorem.words(),
        content: faker.lorem.paragraph(),
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        }
    }
};


//teardown inbetween tests
function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
  }


  describe('BlogPost API resource', function() {

   
    before(function() {
      return runServer(TEST_DATABASE_URL);
    });
  
    beforeEach(function() {
      return seedBlogPostData();
    });
  
    afterEach(function() {
      return tearDownDb();
    });
  
    after(function() {
      return closeServer();
    });

    //GET endpoint
    describe('GET endpoint', function () {
        it('shoudl return all existing blogposts', function() {
            let res; 
            return chai.request(app)
            .get('/posts')
            .then(function (resObj) {
                res = resObj;
                res.should.have.status(200);
                res.body.should.have.lengthOf.at.least(1);
                return BlogPost.count();
            })
            .then(function(count){
                res.body.should.have.lengthOf(count);
            });
        })
    });

    // GET: all posts to have expected keys
    it("should return blog posts all with expected keys", function(){
        let resBlogPosts;
        return chai.request(app)
        .get('/posts')
        .then( function(res) {
            expect(res).to.have.status(200);
            res.body.forEach(post => {
                expect(post).to.include.keys('title', 'content', 'author');
            });
        });
    });

// --------------------------- END OF GET ---------------------------

// start of POST: post new blog to db then return that post to ensure it worked
describe("POST endpoint", function(){
    it("should add a new blogpost", function(){
        const newPost = generateBlogPostData()
        return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(function(res){
            expect(res).to.have.status(201);
            res.body.content.should.equal(newPost.content);
            return BlogPost.findById(res.body.id);
        })
        .then(post => {
            post.title.should.equal(newPost.title);
        })
    })
})
// --------------------------- END OF POST ---------------------------

// PUT request
describe("PUT endpoint", function(){
    it("should update an exisiting blog entry", function(){
        let updatedData = generateBlogPostData()
        return BlogPost
        .findOne()
        .then(post => {
            updatedData.id = post.id;
            return chai.request(app)
            .put(`/posts/${post.id}`)
            .send(updatedData);
        })
        .then(res => {
            res.should.have.status(204);
            return BlogPost.findById(updatedData.id);
        })
        .then(post => {
            post.title.should.equal(updatedData.title);
        })
    })
});
// --------------------------- END OF POST ---------------------------

// Delte request: get a post and its id, delete the post then check it is not in db
describe("DELETE request", () => {
    it("should delete a post from db", () => {
        let returnedPost;
        return BlogPost
        .findOne()
        .then(res => {
            returnedPost = res;
            return chai.request(app).delete(`/posts/${returnedPost.id}`)
        })
        .then(res => {
            expect(res).to.have.status(204);
            return BlogPost.findById(returnedPost.id);
        })
        .then(delPost => {
            should.not.exist(delPost);
        })
        
    })
})


});



