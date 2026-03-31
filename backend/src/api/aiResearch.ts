import { Router } from 'express';
import { getLastResearch } from '../intelligence/aiResearchPipeline';
import { getAIResearchStateFilePath } from '../intelligence/aiResearchStore';

const router = Router();

router.get('/ai/research', (_req, res) => {
  try {
    const report = getLastResearch();
    if (!report) {
      return res.status(200).json({
        available: false,
        message: 'AI research not yet available',
        persistence: {
          stateFile: getAIResearchStateFilePath(),
        },
      });
    }

    res.json({
      available: true,
      persistence: {
        stateFile: getAIResearchStateFilePath(),
      },
      report,
    });
  } catch (e) {
    res.status(500).json({ error: 'AI research unavailable', detail: String(e) });
  }
});

export default router;
