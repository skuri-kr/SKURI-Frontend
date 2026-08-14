import {buildTimetableSemesterRecord} from '../timetableApiMapper';

describe('buildTimetableSemesterRecord', () => {
  it('백엔드 시간표 응답을 상세 화면 모델로 변환한다', () => {
    const record = buildTimetableSemesterRecord({
      catalogCourses: [
        {
          id: 'catalog-course',
          semester: '2026-1',
          code: '01255',
          division: '001',
          name: '민법총칙',
          credits: 3,
          isOnline: false,
          professor: '문상혁',
          department: '법학과',
          grade: 2,
          category: '전공선택',
          location: '영401',
          note: null,
          schedule: [
            {
              dayOfWeek: 1,
              startPeriod: 3,
              endPeriod: 4,
            },
          ],
        },
      ],
      semesterId: '2026-1',
      timetable: {
        id: 'timetable-1',
        semester: '2026-1',
        courseCount: 2,
        totalCredits: 5,
        courses: [
          {
            id: 'catalog-course',
            code: '01255',
            division: '001',
            name: '민법총칙',
            professor: '문상혁',
            location: '영401',
            category: '전공선택',
            department: '법학과',
            credits: 3,
            isOnline: false,
            schedule: [
              {
                dayOfWeek: 1,
                startPeriod: 3,
                endPeriod: 4,
              },
            ],
          },
          {
            id: 'manual-course',
            code: '직접 입력',
            division: null,
            name: '플랫폼세미나',
            professor: null,
            location: null,
            category: null,
            department: '컴퓨터공학과',
            credits: 2,
            isOnline: true,
            schedule: [],
          },
        ],
        slots: [
          {
            courseId: 'catalog-course',
            courseName: '민법총칙',
            code: '01255',
            dayOfWeek: 1,
            startPeriod: 3,
            endPeriod: 4,
            professor: '문상혁',
            location: '영401',
          },
        ],
      },
      toneMap: {
        'manual-course': 'red',
      },
    });

    expect(record.id).toBe('2026-1');
    expect(record.label).toBe('2026-1학기');
    expect(record.catalogCourses[0]?.schedules[0]).toEqual({
      day: 'mon',
      startPeriod: 3,
      endPeriod: 4,
    });
    expect(record.catalogCourses[0]).toMatchObject({
      category: '전공선택',
      department: '법학과',
      grade: 2,
    });
    expect(record.courses[0]).toMatchObject({
      id: 'catalog-course',
      department: '법학과',
      name: '민법총칙',
      isOnline: false,
      locationLabel: '영401',
    });
    expect(record.courses[1]).toMatchObject({
      id: 'manual-course',
      department: '컴퓨터공학과',
      name: '플랫폼세미나',
      isOnline: true,
      professor: '-',
      schedules: [],
      toneId: 'red',
    });
  });

  it('UUID 기반 course id도 기본 색상이 한 가지로 쏠리지 않는다', () => {
    const record = buildTimetableSemesterRecord({
      catalogCourses: [],
      semesterId: '2026-1',
      timetable: {
        id: 'timetable-uuid-colors',
        semester: '2026-1',
        courseCount: 4,
        totalCredits: 12,
        courses: [
          {
            id: '03cf4707-ed31-44d9-a187-65963cca657d',
            code: '21651',
            division: '001',
            name: '기독교로의초대',
            professor: '교수1',
            location: '영401',
            category: '교양필수',
            credits: 3,
            isOnline: false,
            schedule: [
              {
                dayOfWeek: 1,
                startPeriod: 1,
                endPeriod: 2,
              },
            ],
          },
          {
            id: '3060ecd8-bfc6-4f3b-94fa-677674edfcee',
            code: '21179',
            division: '001',
            name: '도시빅데이터',
            professor: '교수2',
            location: '영402',
            category: '전공선택',
            credits: 3,
            isOnline: false,
            schedule: [
              {
                dayOfWeek: 2,
                startPeriod: 3,
                endPeriod: 4,
              },
            ],
          },
          {
            id: '48981e6a-e64a-445b-88ba-8f73af121fd9',
            code: '19737',
            division: '001',
            name: '기초글쓰기',
            professor: '교수3',
            location: '영403',
            category: '교양선택',
            credits: 3,
            isOnline: false,
            schedule: [
              {
                dayOfWeek: 3,
                startPeriod: 5,
                endPeriod: 6,
              },
            ],
          },
          {
            id: '76a9b161-4906-4bc6-b6d7-bf2bd6fea273',
            code: '20056',
            division: '001',
            name: '도시의이해',
            professor: '교수4',
            location: '영404',
            category: '전공선택',
            credits: 3,
            isOnline: false,
            schedule: [
              {
                dayOfWeek: 4,
                startPeriod: 7,
                endPeriod: 8,
              },
            ],
          },
        ],
        slots: [],
      },
      toneMap: {},
    });

    expect(record.courses.map(course => course.toneId)).toEqual([
      'red',
      'orange',
      'purple',
      'pink',
    ]);
  });
});
