# Solving Rubik's Cube Using AI

Before starting I would like to clear that when I say "Solving Rubik's cube using AI" I dont mean that we are going to use Neural Network or any other Machine Learning algorithm. Here I tried to approach how to solve the rubiks cube pure algorithmically. 

My inital motivation was when I learned about state-space search and learnt about solving games like 8-puzzle. Why not trying to solve a Rubik's Cube? 

First we need to define the problem. 
For now: 
- State → configuration of the cube
- Actions → rotations (U, D, L, R, F, B, etc.)
- Goal state → solved cube
- Path → sequence of moves

## First big hurdle

Well ofcourse I didnt expect it to go smoothly. It is harder than 8-puzzle. But why? Total number of states in 8-puzzle is ≈ 9! = 362,880

How many for Rubik's Cube? (3x3) 

Well I did some research and a bit of maths to find out.
It's roughly: 

43 quintillion ( 4.3 × 10¹⁹ )

