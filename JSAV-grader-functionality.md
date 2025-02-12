

# Model answer function

The model answer function is the model solution for the exercise. It both shows the correct answer with the model solution button as well as grades the student's answer. 

The model answer function has two types of steps that can be done: 
- `gradableStep()`: a step that is used in the grading in the model answer.
- `step()`: a step that is shown in the model answer, but has no bearing on the grading. This can be used to give more explanations for intermediary steps. 

The model answer function takes a single parameter, which is the JSAV used for the model answer. This is passed along by the JSAV library when the model solution is called form. 

The model answer function returns the structures that are used when the model solution is compared to the student's solution. This is either a datastructure directly, or an array of data sctructures. The order of the data structures should be the same between the exercise initialisation and the model answer. 



# Exercise creation parameters

To create the exercise: 

    var exercise = av.exercise(modelSolution, reset,
                    {feedback: "continuous", compare: {class: "jsavhighlight"}});
    exercise.reset();

Three parameters are required: 
- `modelSolution`: the name of the function that contains the model solution
- `reset`: a function that resets the exercise
- `options object`: an object that contains the extra parameters. It is unclear which ones are required. `compare` sets the properties to compare the model solution and student solution on. 

# Compare
Compare can take the following options:

- `css` property
- `class` class on the html element


## How it compares

In general: 
1. Check if data structures are the same
2. Check if sub-data structures are the same
3. Check with regards to css option or class option
4. If all is the same, consider the two to be equal

Down below is a breakdown of the comparison per data structure. 


### Trees
 
1. Check is to see if both data structures are trees. If false, they cannot be equal
2. Check for each node if they are equal, with `options` passed along in this call

### Tree nodes 
1. Check if the value of the nodes is equal
2. if options exist: 
    1. if css options: check if css is the same for the css options param
    2. if class options: check if class is the same for the class options param
3. if edge to parent: check if edge is the same with regards to options
4. Check the children: 
    1. Check if same amount of children
    2. check if all children are the same with respect to the above
5. If nothing is unequal: consider equal

### Graphs
1. Check if the other data structure is a graph
2. Check if node and edge counts are equal
3. Sort all nodes and check if all nodes are equa, with `options` passed along

### Graph nodes
1. Check if the value of the nodes is equal
2. if options exist: 
    1. if css options: check if css is the same for the css options param
    2. if class options: check if class is the same for the class options param
4. check neighbours: 
    1. check if same number of neighbours
    2. check if the neighbours are the same with the respect to the above
    3. check if the edges are the same with respect to `options`. 
5. If nothing is unequal: consider equal


### Matrix
if the other object is an aray: 
1. check for each item in array to be the same
4. if nothing is unequal: consider equal


if the other object is a JSAV matrix
1. Check if the arrays are the same length
2. check if each item of the arrays are the same
4. if nothing is unequal: consider equal



### Array
if other object is an array or JSAV array: 
1. check if the lengths are the same
2. check if all items are the same
3. if options: 
    1. if css options: check if css is the same for the css options param
    2. if class options: check if class is the same for the class options param
4. if nothing is unequal: consider equal

Index: 
1. check if index value are the same
2. if options: 
    1. if css options: check if css is the same for the css options param
    2. if class options: check if class is the same for the class options param
4. if nothing is unequal: consider equal



### code
Variable: 
1. check if other item has the same value
2. if options: 
    1. if css options: check if css is the same for the css options param
    2. if class options: check if class is the same for the class options param
4. if nothing is unequal: consider equal

Pointer: 
1. check if other item is a pointer
2. if options: 
    1. if css options: check if css is the same for the css options param
    2. if class options: check if class is the same for the class options param
3. if nothig is unequal thus far: return whether the target is the same. 


### edge
This one is located within the `datastructures.js` file. 

1. check if other item is an edge
2. if options: 
    1. if not check other nodes: check if start and end nodes are the same
    2. if css options: check if css is the same for the css options param
    2. if class options: check if class is the same for the class options param
3. Check if weight is the same
4. if nothing is unequal: consider equal

### label
In `graphicals.js` file. 
1. check if other item is a label
2. check if text is the same
3. if options: 
    1. if css options: check if css is the same for the css options param
    2. if class options: check if class is the same for the class options param
4. if nothing is unequal: consider equal

### list
1. check if lists are both empty (=> return true)
2. check if one list is empty, other is not empty (=> return false)
3. check if first nodes of both are equal

### listnode
1. check if both nodes have same value
3. if options: 
    1. if css options: check if css is the same for the css options param
    2. if class options: check if class is the same for the class options param
4. check if edge to next node is the same
5. check above for if 
4. if nothing is unequal: consider equal