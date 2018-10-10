const input = {
  marks: [
    {test_id: 1, student_id: 1, mark: 78},
    {test_id: 2, student_id: 1, mark: 87},
    {test_id: 3, student_id: 1, mark: 95},
    {test_id: 4, student_id: 1, mark: 32},
    {test_id: 5, student_id: 1, mark: 65},
    {test_id: 6, student_id: 1, mark: 78},
    {test_id: 7, student_id: 1, mark: 40},
    {test_id: 1, student_id: 2, mark: 78},
    {test_id: 2, student_id: 2, mark: 87},
    {test_id: 3, student_id: 2, mark: 15},
    {test_id: 6, student_id: 2, mark: 78},
    {test_id: 7, student_id: 2, mark: 40},
    {test_id: 1, student_id: 3, mark: 78},
    {test_id: 2, student_id: 3, mark: 87},
    {test_id: 3, student_id: 3, mark: 95},
    {test_id: 4, student_id: 3, mark: 32},
    {test_id: 5, student_id: 3, mark: 65},
    {test_id: 6, student_id: 3, mark: 78},
    {test_id: 7, student_id: 3, mark: 40},
  ],

  tests: [
    {id: 1, course_id: 1, weight: 10},
    {id: 2, course_id: 1, weight: 40},
    {id: 3, course_id: 1, weight: 50},
    {id: 4, course_id: 2, weight: 40},
    {id: 5, course_id: 2, weight: 60},
    {id: 6, course_id: 3, weight: 90},
    {id: 7, course_id: 3, weight: 10},
  ],

  courses: [
    {id: 1, name: 'Biology', teacher: 'Mr. D'},
    {id: 2, name: 'History', teacher: 'Mrs. P'},
    {id: 3, name: 'Math', teacher: 'Mrs. C'},
  ],

  students: [{id: 1, name: 'A'}, {id: 2, name: 'B'}, {id: 3, name: 'C'}],
};

const reports = {};

{
  const courses = {};
  for (const {id: courseID, name, teacher} of input.courses)
    courses[courseID] = {courseID, name, teacher};

  const students = {};
  for (const {id: studentID, name} of input.students) students[studentID] = {studentID, name};

  const tests = {};
  for (const {id: testID, course_id: courseID, weight} of input.tests) {
    tests[testID] = {testID, courseID, weight};
  }

  for (const {test_id: testID, student_id: studentID, mark} of input.marks) {
    // if (!(studentID in students) throw ReferenceError('studentID not found in students')
    const student = reports[studentID] || (reports[studentID] = students[studentID]);

    // if (!(testID in tests) throw ReferenceError('testID not found in tests')
    const {courseID, weight} = tests[testID];

    const studentCourses = student.courses || (student.courses = {});
    const studentCourse =
      studentCourses[courseID] ||
      (studentCourses[courseID] = {...courses[courseID], marks: [], grade: 0});

    const grade = (mark * weight) / 100;
    studentCourse.grade += grade;
    studentCourse.marks.push({studentID, courseID, mark, weight, grade});
  }
}

console.log(require('util').inspect(reports, false, 10, true));
