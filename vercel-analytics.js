/**
 * Vercel Web Analytics Integration
 * This module injects Vercel Web Analytics tracking into the application
 */

import { inject } from '@vercel/analytics';

// Inject analytics - automatically detects development vs production
inject();
