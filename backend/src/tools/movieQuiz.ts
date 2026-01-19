const MovieQuizSchema = z.object({
  tmdb_id: z.number().int().positive().optional(),
  title: z.string().min(1).optional(),
  question_count: z.number().int().min(3).max(8).optional(),
});
...
async function handleMovieQuiz(input: MovieQuizInput): Promise<MovieQuizResult> {
  if (!input.tmdb_id && !input.title) {
    throw new Error('Either tmdb_id or title is required.');
  }

  const movie = await resolveMovie(input);
  const questionCount = input.question_count ?? 5;
  ...
  const questions = shuffle(questionBank).slice(0, questionCount);
}
