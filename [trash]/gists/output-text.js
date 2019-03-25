const generateStudentReport = ({studentID, name: studentName, courses, totalGrade}) => {
  let report = [
    `
Student Id: ${studentID}, name: ${studentName}
Total Average:\t${100 * totalGrade}%
`,
  ];

  for (const {name: courseName, teacher, finalGrade} of courses)
    report.push(`
\tCourse: Biology, Teacher: Mr. D
\tFinal Grade:\t${100 * finalGrade}%
`);

  return report.join('\n').trim();
};
