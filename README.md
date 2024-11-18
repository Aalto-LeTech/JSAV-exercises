# JSAV exercises

JavaScript algorithm exercises made using the [JSAV framework](https://github.com/vkaravir/JSAV).

## Exercises

Check the exercises here:

http://aalto-letech.github.io/JSAV-exercises/

## Getting started

After cloning the repo you should run the following commands:

```
git submodule init
git submodule update
cd JSAV
make
cd ..
```

## Updating gh-pages

You can update gh-pages with the update script:

```
git checkout gh-pages
./update
git commit -m "Updated gh-pages"
git push origin gh-pages
git checkout master
```
