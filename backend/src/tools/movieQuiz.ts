import { z } from 'zod';
import { MOVIE_QUIZ_WIDGET_URL } from '../utils/config.js';
import { getMovieDetails as fetchMovieDetails, searchMovies as tmdbSearchMovies } from '../utils/tmdb.js';
import { OPENAI_WIDGET_META, WIDGET_CONFIG } from '../config/constants.js';
import { withToolHandler } from '../utils/tool-helpers.js';

const MovieQuizSchema = z.object({
  tmdb_id: z.number().int().positive().optional(),
  title: z.string().min(1).optional(),
  question_count: z.number().int().min(3).max(8).optional(),
}).refine(
  (data) => data.tmdb_id !== undefined || data.title !== undefined,
  { message: 'Either tmdb_id or title is required.' }
);

export type MovieQuizInput = z.infer<typeof MovieQuizSchema>;

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type MovieQuizPayload = {
  movie: {
    tmdb_id: number;
    title: string;
    year: number | null;
    poster_url: string | null;
    backdrop_url: string | null;
  };
  questions: QuizQuestion[];
};

interface MovieQuizResult {
  message: string;
  quiz: MovieQuizPayload;
  widgetMeta?: any;
}

const DIRECTOR_DISTRACTORS = [
  'Steven Spielberg',
  'Greta Gerwig',
  'Denis Villeneuve',
  'Patty Jenkins',
  'Ridley Scott',
  'Ava DuVernay',
  'James Cameron',
  'Jordan Peele',
  'Kathryn Bigelow',
  'Christopher Nolan',
  'Lana Wachowski',
  'Damien Chazelle',
  'Guillermo del Toro',
  'Taika Waititi',
  'Bong Joon-ho',
];

const GENRE_DISTRACTORS = [
  'Science Fiction',
  'Action',
  'Drama',
  'Comedy',
  'Romance',
  'Thriller',
  'Fantasy',
  'Documentary',
  'Horror',
  'Mystery',
  'Western',
  'Animation',
];

function shuffle<T>(items: T[]): T[] {
  const array = [...items];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }
  return array;
}

function buildOptions(correct: string, distractors: string[], total = 4): { options: string[]; correctIndex: number } {
  const uniqueDistractors = Array.from(new Set(distractors.filter((value) => value !== correct)));
  const picks = shuffle(uniqueDistractors).slice(0, Math.max(total - 1, 0));
  const options = shuffle([correct, ...picks]);
  return { options, correctIndex: options.indexOf(correct) };
}

async function resolveMovie(input: MovieQuizInput) {
  if (input.tmdb_id) {
    return fetchMovieDetails(input.tmdb_id);
  }

  if (!input.title) {
    throw new Error('Either tmdb_id or title is required.');
  }

  const searchResults = await tmdbSearchMovies(input.title);
  if (searchResults.length === 0) {
    throw new Error(`No movie found matching "${input.title}". Please check the title and try again.`);
  }

  const match = searchResults[0];
  return fetchMovieDetails(match.tmdb_id);
}

function buildYearQuestion(movie: { title: string; year: number | null }): QuizQuestion | null {
  if (!movie.year) return null;

  const year = movie.year;
  const optionsBase = [year - 2, year, year + 1, year + 2]
    .filter((value) => value > 1900)
    .map((value) => value.toString());

  const { options, correctIndex } = buildOptions(year.toString(), optionsBase);

  return {
    id: 'release-year',
    question: `What year was "${movie.title}" released?`,
    options,
    correctIndex,
    explanation: `The film premiered in ${year}.`,
  };
}

function buildDirectorQuestion(movie: { title: string; director: string | null }): QuizQuestion | null {
  if (!movie.director) return null;

  const { options, correctIndex } = buildOptions(movie.director, DIRECTOR_DISTRACTORS);

  return {
    id: 'director',
    question: `Who directed "${movie.title}"?`,
    options,
    correctIndex,
    explanation: `${movie.director} is credited as the director.`,
  };
}

function buildCharacterQuestion(movie: { title: string; cast: Array<{ name: string; character: string | null }> }): QuizQuestion | null {
  const characterPick = movie.cast.find((member) => member.character && member.name);
  if (!characterPick) return null;

  const castNames = movie.cast.map((member) => member.name).filter(Boolean);

  const { options, correctIndex } = buildOptions(characterPick.name, castNames);

  return {
    id: 'character',
    question: `Who played ${characterPick.character} in "${movie.title}"?`,
    options,
    correctIndex,
    explanation: `${characterPick.name} portrays ${characterPick.character}.`,
  };
}

function buildGenreQuestion(movie: { title: string; genres: Array<{ name: string }> }): QuizQuestion | null {
  const primaryGenre = movie.genres?.[0]?.name;
  if (!primaryGenre) return null;

  const { options, correctIndex } = buildOptions(primaryGenre, GENRE_DISTRACTORS);

  return {
    id: 'genre',
    question: `Which genre is "${movie.title}" associated with?`,
    options,
    correctIndex,
    explanation: `${movie.title} is categorized as ${primaryGenre}.`,
  };
}

function buildRuntimeQuestion(movie: { title: string; runtime: number | null }): QuizQuestion | null {
  if (!movie.runtime) return null;

  const runtime = movie.runtime;
  const optionsRaw = [runtime - 20, runtime, runtime + 10, runtime + 20]
    .filter((value) => value > 0)
    .map((value) => `${value} minutes`);
  const correctLabel = `${runtime} minutes`;

  const { options, correctIndex } = buildOptions(correctLabel, optionsRaw);

  return {
    id: 'runtime',
    question: `About how long is "${movie.title}"?`,
    options,
    correctIndex,
    explanation: `The official runtime is ${runtime} minutes.`,
  };
}

async function handleMovieQuiz(input: MovieQuizInput): Promise<MovieQuizResult> {
  if (!input.tmdb_id && !input.title) {
    throw new Error('Either tmdb_id or title is required.');
  }

  const movie = await resolveMovie(input);
  const questionCount = input.question_count ?? 5;

  const questionBank = [
    buildYearQuestion(movie),
    buildDirectorQuestion(movie),
    buildCharacterQuestion(movie),
    buildGenreQuestion(movie),
    buildRuntimeQuestion(movie),
  ].filter((question): question is QuizQuestion => Boolean(question));

  if (questionBank.length < 3) {
    throw new Error('Not enough data to generate a quiz for this movie.');
  }

  const questions = shuffle(questionBank).slice(0, Math.min(questionCount, questionBank.length));

  const quiz: MovieQuizPayload = {
    movie: {
      tmdb_id: movie.tmdb_id,
      title: movie.title,
      year: movie.year ?? null,
      poster_url: movie.poster_url ?? null,
      backdrop_url: movie.backdrop_url ?? null,
    },
    questions,
  };

  const widgetMeta = MOVIE_QUIZ_WIDGET_URL
    ? {
        'openai/outputTemplate': WIDGET_CONFIG.quiz.uri,
        ...OPENAI_WIDGET_META,
        'openai/toolInvocation/invoking': 'Generating movie quiz...',
        'openai/toolInvocation/invoked': 'Generated movie quiz',
      }
    : undefined;

  return {
    message: `Generated a ${questions.length}-question quiz for ${movie.title}.`,
    quiz,
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
    message: result.message,
  }),
  toMeta: (result) => result.widgetMeta,
  errorMessagePrefix: 'Failed to generate movie quiz',
});

export const movieQuizToolDefinition = {
  name: 'movie_quiz',
  description: 'Generate a multiple-choice trivia quiz for a movie. Provide tmdb_id if you already have it, or a title to search. Returns structured quiz data suitable for the Movie Quiz widget.',
  inputSchema: {
    type: 'object',
    properties: {
      tmdb_id: {
        type: 'number',
        description: 'TMDB movie identifier (use this if you already have it from search_movies).',
      },
      title: {
        type: 'string',
        description: 'Movie title to search for and generate trivia questions.',
      },
      question_count: {
        type: 'number',
        description: 'Number of questions to generate (3-8, default: 5).',
        minimum: 3,
        maximum: 8,
      },
    },
  },
  ...(MOVIE_QUIZ_WIDGET_URL && {
    _meta: {
      'openai/outputTemplate': WIDGET_CONFIG.quiz.uri,
      ...OPENAI_WIDGET_META,
      'openai/toolInvocation/invoking': 'Generating movie quiz...',
      'openai/toolInvocation/invoked': 'Generated movie quiz',
    },
  }),
};
