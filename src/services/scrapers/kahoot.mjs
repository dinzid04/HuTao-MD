const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const KAHOOT_REST_API = 'https://create.kahoot.it/rest/kahoots';

function cleanText(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/<[^>]+>/g, '').trim();
}

function extractQuizUuid(input) {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = trimmed.match(uuidRegex);
  return match ? match[0] : trimmed;
}

export async function getQuizAnswers(quizIdOrUrl, options = {}) {
  const uuid = extractQuizUuid(quizIdOrUrl);
  if (!uuid) {
    throw new Error('Valid Kahoot Quiz UUID or URL is required');
  }

  const timeoutMs = options.timeout || 15000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${KAHOOT_REST_API}/${uuid}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': options.userAgent || DEFAULT_USER_AGENT,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Kahoot quiz not found or is set to Private (HTTP 404)`);
      }
      throw new Error(`Failed to fetch Kahoot quiz data (HTTP ${res.status})`);
    }

    const data = await res.json();
    const questions = (data.questions || []).map((q, index) => {
      const choices = (q.choices || []).map(c => ({
        answer: cleanText(c.answer),
        correct: Boolean(c.correct)
      }));

      const correctAnswers = choices.filter(c => c.correct).map(c => c.answer);

      return {
        number: index + 1,
        question: cleanText(q.question),
        type: q.type || 'quiz',
        time_limit_ms: q.time || 20000,
        points: q.points ?? true,
        image_url: q.image || null,
        choices,
        correct_answers: correctAnswers
      };
    });

    return {
      success: true,
      uuid: data.uuid || uuid,
      title: data.title || '',
      description: data.description || '',
      creator_username: data.creator_username || '',
      total_questions: questions.length,
      cover_image: data.cover || null,
      questions
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function searchQuiz(query, options = {}) {
  if (!query || typeof query !== 'string') {
    throw new Error('Search query string is required');
  }

  const limit = options.limit || 5;
  const timeoutMs = options.timeout || 15000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${KAHOOT_REST_API}/?query=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': options.userAgent || DEFAULT_USER_AGENT,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    if (!res.ok) {
      throw new Error(`Failed to search Kahoot quizzes (HTTP ${res.status})`);
    }

    const data = await res.json();
    const entities = data.entities || [];

    const results = entities.map(item => {
      const card = item.card || {};
      return {
        uuid: card.uuid || '',
        title: card.title || '',
        description: card.description || '',
        creator_username: card.creator_username || '',
        number_of_questions: card.number_of_questions || 0,
        cover_image: card.cover || null,
        details_url: `https://create.kahoot.it/details/${card.uuid}`
      };
    });

    return {
      success: true,
      query,
      total_results: results.length,
      results
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export default {
  getQuizAnswers,
  searchQuiz
};