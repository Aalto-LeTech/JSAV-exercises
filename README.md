# JSAV exercises

JavaScript algorithm exercises made using the [JSAV framework](https://github.com/vkaravir/JSAV).

This repo merges exercises from
[traky](https://version.aalto.fi/gitlab/course/traky) and
[jsav-exercise-recorder](https://github.com/Aalto-LeTech/jsav-exercise-recorder)
repositories to one place. Aim is to have all the future development of the exercises in this repository.

Currently work in progress.

## TODO

- Integrate JSAV exercise recorder (as submodule?)
- Add JSAV library as submodule?
- Transfer JSAV issues from [jsav-exercise-recorder](https://github.com/Aalto-LeTech/jsav-exercise-recorder) to this repo
- Update exercises list seen in github pages?

## Exercises

Check the exercises here:

http://aalto-letech.github.io/JSAV-exercises/

The exercise list should be updated!

## Updating gh-pages

You can update gh-pages with the update script:

```bash
git checkout gh-pages
./update
git commit -m "Updated gh-pages"
git push origin gh-pages
git checkout master
```
