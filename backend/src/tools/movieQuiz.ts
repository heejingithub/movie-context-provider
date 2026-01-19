/**
 * Movie Quiz Tool
 * Generate trivia-style quiz questions for a movie
 */

import { z } from 'zod';
import { buildWidgetMeta, withToolHandler } from '../utils/tool-helpers.js';
import { getMovieDetails, searchMovies } from '../utils/tmdb.js';
import { MOVIE_QUIZ_WIDGET_URL } from '../utils/config.js';
import { WIDGET_CONFIG } from '../config/constants.js';

const MovieQuizSchema = z
  .object({
    tmdb_id: z.number().int().positive().optional(),
    title: z.string().min(1).optional(),
    question_count: z.number().int().min(3).max(8).default(5),
  })
  .superRefine((value, ctx) => {
    if (!value.tmdb_id && !value.title) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either tmdb_id or title is required.',
        path: ['tmdb_id'],
      });
    }
  });

export type MovieQuizInput = z.infer<typeof MovieQuizSchema>;

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type QuizMovie = {
  tmdb_id: number;
  title: string;
  year: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
};

type MovieQuizResult = {
  message: string;
  quiz: {
    movie: QuizMovie;
    questions: QuizQuestion[];
  };
  widgetMeta?: any;
};

const FALLBACK_NAMES = [
  'Greta Gerwig',
  'Steven Spielberg',
  'Denis Villeneuve',
  'Sofia Coppola',
  'Jordan Peele',
  'Chloé Zhao',
  'Christopher Nolan',
  'Kathryn Bigelow',
];

const GENRE_POOL = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'History',
  'Horror',
  'Music',
  'Mystery',
  'Romance',
  'Science Fiction',
  'Thriller',
  'War',
  'Western',
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildYearQuestion(movie: QuizMovie): QuizQuestion | null {
  if (!movie.year) return null;
  const year = movie.year;
  const options = uniqueStrings([
    year.toString(),
    (year - 1).toString(),
    (year + 1).toString(),
    (year + 2).toString(),
  ]);
  const finalOptions = shuffle(options).slice(0, 4);
  return {
    id: 'release-year',
    question: `What year was "${movie.title}" released?`,
    options: finalOptions,
    correctIndex: finalOptions.indexOf(year.toString()),
    explanation: `The film premiered in ${year}.`,
  };
}

function buildDirectorQuestion(movie: QuizMovie, director: string | null, cast: string[]): QuizQuestion | null {
  if (!director) return null;
  const options = uniqueStrings([
    director,
    ...cast.filter((name) => name !== director).slice(0, 2),
    ...FALLBACK_NAMES.filter((name) => name !== director).slice(0, 2),
  ]).slice(0, 4);
  const finalOptions = shuffle(options);
  return {
    id: 'director',
    question: `Who directed "${movie.title}"?`,
    options: finalOptions,
    correctIndex: finalOptions.indexOf(director),
    explanation: `${director} is credited as the director.`,
  };
}

function buildRuntimeQuestion(movie: QuizMovie, runtime: number | null): QuizQuestion | null {
  if (!runtime) return null;
  const options = uniqueStrings([
    `${runtime} minutes`,
    `${runtime + 10} minutes`,
    `${Math.max(runtime - 10, 60)} minutes`,
    `${runtime + 20} minutes`,
  ]);
  const finalOptions = shuffle(options).slice(0, 4);
  return {
    id: 'runtime',
    question: `About how long is "${movie.title}"?`,
    options: finalOptions,
    correctIndex: finalOptions.indexOf(`${runtime} minutes`),
    explanation: `The official runtime is ${runtime} minutes.`,
  };
}

function buildGenreQuestion(movie: QuizMovie, genres: string[]): QuizQuestion | null {
  if (genres.length === 0) return null;
  const correct = genres[0];
  const distractors = GENRE_POOL.filter((genre) => !genres.includes(genre)).slice(0, 3);
  const options = shuffle(uniqueStrings([correct, ...distractors])).slice(0, 4);
  return {
    id: 'genre',
    question: `Which genre is "${movie.title}" associated with?`,
    options,
    correctIndex: options.indexOf(correct),
    explanation: `${movie.title} is categorized as ${correct}.`,
  };
}

function buildCharacterQuestion(movie: QuizMovie, cast: Array<{ name: string; character: string | null }>): QuizQuestion | null {
  const candidate = cast.find((member) => member.character);
  if (!candidate?.character) return null;
  const options = uniqueStrings([
    candidate.name,
    ...cast
      .filter((member) => member.name !== candidate.name)
      .map((member) => member.name)
      .slice(0, 2),
    ...FALLBACK_NAMES.filter((name) => name !== candidate.name).slice(0, 1),
  ]).slice(0, 4);
  const finalOptions = shuffle(options);
  return {
    id: 'character',
    question: `Who played ${candidate.character} in "${movie.title}"?`,
    options: finalOptions,
    correctIndex: finalOptions.indexOf(candidate.name),
    explanation: `${candidate.name} portrays ${candidate.character}.`,
  };
}

async function resolveMovie(input: MovieQuizInput) {
  if (input.tmdb_id) {
    return getMovieDetails(input.tmdb_id);
  }

  const results = await searchMovies(input.title ?? '');
  if (results.length === 0) {
    throw new Error(`No movies found for "${input.title}"`);
  }
  return getMovieDetails(results[0].tmdb_id);
}

async function handleMovieQuiz(input: MovieQuizInput): Promise<MovieQuizResult> {
  const movie = await resolveMovie(input);

  const quizMovie: QuizMovie = {
    tmdb_id: movie.tmdb_id,
    title: movie.title,
    year: movie.year,
    poster_url: movie.poster_url,
    backdrop_url: movie.backdrop_url,
  };

  const castNames = movie.cast?.map((member) => member.name) ?? [];
  const genreNames = movie.genres?.map((genre) => genre.name) ?? [];

  const questionBank = [
    buildYearQuestion(quizMovie),
    buildDirectorQuestion(quizMovie, movie.director, castNames),
    buildRuntimeQuestion(quizMovie, movie.runtime),
    buildGenreQuestion(quizMovie, genreNames),
    buildCharacterQuestion(
      quizMovie,
      (movie.cast ?? []).map((member) => ({ name: member.name, character: member.character }))
    ),
  ].filter((question): question is QuizQuestion => Boolean(question));

  if (questionBank.length === 0) {
    throw new Error('Not enough data to generate quiz questions.');
  }

  const questions = shuffle(questionBank).slice(0, input.question_count);

  const widgetMeta = MOVIE_QUIZ_WIDGET_URL
    ? {
        ...buildWidgetMeta(WIDGET_CONFIG.quiz.uri, {
          invoking: 'Building quiz...',
          invoked: 'Quiz ready',
        }),
      }
    : undefined;

  return {
    message: `Quiz ready for "${movie.title}"`,
    quiz: {
      movie: quizMovie,
      questions,
    },
    widgetMeta,
  };
}

export const movieQuiz = withToolHandler({
  schema: MovieQuizSchema,
  toolName: 'movie_quiz',
  handler: handleMovieQuiz,
  toTextContent: (result) => result.message,
  toStructuredContent: (result) => ({
    success: true,
    quiz: result.quiz,
  }),
  toMeta: (result) => result.widgetMeta,
  errorMessagePrefix: 'Failed to generate movie quiz',
});

export const movieQuizToolDefinition = {
  name: 'movie_quiz',
  description:
    'Generate a multiple-choice trivia quiz for a movie. Provide a TMDB movie ID or title to get a quiz with questions about release year, director, runtime, genres, and cast.',
  inputSchema: {
    type: 'object',
    properties: {
      tmdb_id: {
        type: 'number',
        description: 'TMDB ID of the movie to quiz on',
      },
      title: {
        type: 'string',
        description: 'Movie title (used if tmdb_id is not provided)',
      },
      question_count: {
        type: 'number',
        description: 'Number of quiz questions to generate (3-8, default: 5)',
      },
    },
  },
  suppressTextResponse: true,
  ...(MOVIE_QUIZ_WIDGET_URL && {
    _meta: buildWidgetMeta(WIDGET_CONFIG.quiz.uri, {
      invoking: 'Building quiz...',
      invoked: 'Quiz ready',
    }),
  }),
};
