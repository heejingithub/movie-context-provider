import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import cssContent from '../styles.css?inline';
import { FaCheckCircle, FaRedoAlt, FaTimesCircle } from 'react-icons/fa';
import {
  ButtonSpinner,
  LoadingSpinner,
  buttons,
  callTool,
  containers,
  text,
  useOpenAiGlobal,
} from './shared/index.js';

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type QuizPayload = {
  movie: {
    tmdb_id: number;
    title: string;
    year: number | null;
    poster_url: string | null;
    backdrop_url: string | null;
  };
  questions: QuizQuestion[];
};

type ToolOutput = {
  success: boolean;
  quiz?: QuizPayload;
} | null;

function useQuizPayload(): QuizPayload | null {
  const toolOutput = useOpenAiGlobal('toolOutput') as ToolOutput;
  return useMemo(() => {
    if (!toolOutput) return null;
    return (toolOutput as any)?.structuredContent?.quiz ?? toolOutput.quiz ?? null;
  }, [toolOutput]);
}

function QuizWidget() {
  const theme = useOpenAiGlobal('theme');
  const quiz = useQuizPayload();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
    setAnswers({});
  }, [quiz?.questions?.length, quiz?.movie?.tmdb_id]);

  if (!quiz) {
    return (
      <div className={containers.card}>
        <LoadingSpinner message="Loading quiz..." />
      </div>
    );
  }

  const question = quiz.questions[currentIndex];
  const selectedIndex = answers[question.id];
  const isAnswered = selectedIndex !== undefined;
  const isCorrect = isAnswered && selectedIndex === question.correctIndex;
  const score = Object.entries(answers).reduce(
    (total, [id, answerIndex]) => {
      const match = quiz.questions.find((q) => q.id === id);
      return match && answerIndex === match.correctIndex ? total + 1 : total;
    },
    0
  );

  const totalQuestions = quiz.questions.length;
  const isLast = currentIndex === totalQuestions - 1;

  const handleSelect = (index: number) => {
    if (isAnswered) return;
    setAnswers((prev) => ({ ...prev, [question.id]: index }));
  };

  const handleNext = () => {
    if (!isLast) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setCurrentIndex(0);
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await callTool('movie_quiz', {
        tmdb_id: quiz.movie.tmdb_id,
        question_count: totalQuestions,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className={containers.card}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {quiz.movie.poster_url ? (
            <img
              src={quiz.movie.poster_url}
              alt={quiz.movie.title}
              className="w-28 h-40 object-cover rounded-lg shadow-md"
            />
          ) : (
            <div className="w-28 h-40 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500 dark:text-gray-300">
              No Poster
            </div>
          )}
          <div className="flex-1">
            <p className={text.subheading}>Movie Quiz</p>
            <h2 className={text.heading}>
              {quiz.movie.title}
              {quiz.movie.year ? ` (${quiz.movie.year})` : ''}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Question {currentIndex + 1} of {totalQuestions}
            </p>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all"
                style={{
                  width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {question.question}
          </p>
          <div className="mt-4 grid gap-2">
            {question.options.map((option, index) => {
              const isSelected = selectedIndex === index;
              const isCorrectOption = index === question.correctIndex;
              const base =
                'flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors';
              let stateClass =
                'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500';
              if (isAnswered && isCorrectOption) {
                stateClass = 'border-green-500 bg-green-50 dark:bg-green-900/20';
              } else if (isAnswered && isSelected && !isCorrectOption) {
                stateClass = 'border-red-500 bg-red-50 dark:bg-red-900/20';
              } else if (isSelected) {
                stateClass = 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
              }

              return (
                <button
                  key={option}
                  type="button"
                  className={`${base} ${stateClass} text-left`}
                  onClick={() => handleSelect(index)}
                  disabled={isAnswered}
                >
                  <span className="flex-1 text-gray-800 dark:text-gray-100">
                    {option}
                  </span>
                  {isAnswered && isSelected && !isCorrectOption && (
                    <FaTimesCircle className="text-red-500" />
                  )}
                  {isAnswered && isCorrectOption && (
                    <FaCheckCircle className="text-green-500" />
                  )}
                </button>
              );
            })}
          </div>

          {isAnswered && (
            <div className="mt-4 rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3 text-sm text-gray-700 dark:text-gray-200">
              <p className="font-semibold">
                {isCorrect ? 'Correct!' : 'Not quite.'}
              </p>
              <p className="mt-1">{question.explanation}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Score: <span className="font-semibold text-gray-900 dark:text-white">{score}</span>/{totalQuestions}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttons.secondary}
              onClick={handleRestart}
            >
              Restart
            </button>
            <button
              type="button"
              className={buttons.primary}
              onClick={handleNext}
              disabled={!isAnswered || isLast}
            >
              {isLast ? 'Done' : 'Next'}
            </button>
            <button
              type="button"
              className={buttons.ghost}
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <span className="flex items-center gap-2">
                  <ButtonSpinner />
                  Refreshing
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <FaRedoAlt />
                  New Quiz
                </span>
              )}
            </button>
          </div>
        </div>

        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          Tap answers to reveal explanations. Use “New Quiz” to regenerate questions.
        </p>

        <div className="pt-2 text-center">
          <a
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs ${
              theme === 'dark'
                ? 'text-gray-500 hover:text-gray-400'
                : 'text-gray-400 hover:text-gray-500'
            } no-underline transition-colors`}
          >
            Data from TMDB
          </a>
        </div>
      </div>
    </div>
  );
}

function injectStyles() {
  if (document.getElementById('movie-quiz-widget-styles')) {
    return;
  }

  const styleElement = document.createElement('style');
  styleElement.id = 'movie-quiz-widget-styles';
  styleElement.textContent = cssContent;
  document.head.appendChild(styleElement);
}

function bootstrap() {
  injectStyles();

  const container = document.getElementById('movie-quiz-widget-root');
  if (!container) {
    console.error('MovieQuizWidget: root element not found');
    return;
  }

  const root = createRoot(container);
  root.render(
    <StrictMode>
      <QuizWidget />
    </StrictMode>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
