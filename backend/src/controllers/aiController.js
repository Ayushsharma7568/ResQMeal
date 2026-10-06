import { 
  parseListingText, 
  calculateMatchingScore, 
  generateSurplusInsights, 
  processAdminAnalyticsQuery 
} from '../services/aiService.js';

/**
 * POST /api/ai/parse-listing — Convert unstructured text into structured food items
 */
export const parseListing = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide text description of the surplus food to parse'
      });
    }

    const parsedData = await parseListingText(text);
    return res.status(200).json({
      status: 'success',
      message: 'Surplus food listing parsed successfully',
      data: parsedData
    });
  } catch (error) {
    console.error('AI Parse Listing Error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to parse listing text'
    });
  }
};

/**
 * GET /api/ai/recommendations — Smart recommendation scoring for food seekers
 */
export const getRecommendations = async (req, res) => {
  try {
    const seekerId = req.user?._id;
    const { lat, lng } = req.query;

    const listingsWithScores = await calculateMatchingScore(seekerId, { lat, lng });

    return res.status(200).json({
      status: 'success',
      message: 'Smart recommendations computed successfully',
      data: {
        recommendations: listingsWithScores,
        count: listingsWithScores.length
      }
    });
  } catch (error) {
    console.error('AI Recommendations Error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to compute recommendations'
    });
  }
};

/**
 * GET /api/ai/insights — Platform surplus demand insights & analytics
 */
export const getInsights = async (req, res) => {
  try {
    const insights = await generateSurplusInsights();
    return res.status(200).json({
      status: 'success',
      message: 'Surplus demand insights generated',
      data: insights
    });
  } catch (error) {
    console.error('AI Insights Error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to generate surplus insights'
    });
  }
};

/**
 * POST /api/ai/admin-query — AI Analytics Query Assistant for Admins
 */
export const queryAnalytics = async (req, res) => {
  try {
    const { query } = req.body;
    const result = await processAdminAnalyticsQuery(query || '');

    return res.status(200).json({
      status: 'success',
      message: 'Analytics query executed',
      data: result
    });
  } catch (error) {
    console.error('AI Admin Query Error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to execute analytics query'
    });
  }
};
