// Shared shapes for every Black Sheep University masterclass.
//
// Lesson body strings support a few lightweight markers so lessons can
// read like a real course without custom components:
//   "## Text"  renders as a sub heading
//   "* Text"   renders as a bullet item
//   anything else renders as a normal paragraph
// `links` renders as tappable link buttons under the lesson body.

export interface LessonLink {
  label: string;
  url: string;
}

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  body: string[];
  links?: LessonLink[];
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}
