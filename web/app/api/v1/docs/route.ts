/**
 * API Documentation Endpoint
 * GET /api/v1/docs - OpenAPI specification
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';

  const openApiSpec = {
    openapi: '3.0.0',
    info: {
      title: 'CGM Tracker Community API',
      version: '1.0.0',
      description: 'Public API for accessing CGM Tracker community content',
      contact: {
        name: 'CGM Tracker Support',
        email: 'support@cgmtracker.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://cgmtracker.netlify.app/api/v1',
        description: 'Production server'
      }
    ],
    tags: [
      {
        name: 'Community',
        description: '🏘️ Community tips, comments, and social features for sharing CGM experiences'
      },
      {
        name: 'Authentication',
        description: '🔐 API authentication, key management, and usage tracking'
      },
      {
        name: 'Glucose Data',
        description: '📊 CGM glucose readings, manual entries, and monitoring data'
      },
      {
        name: 'Food Logging',
        description: '🍎 Food consumption tracking, nutrition logging, and meal management'
      },
      {
        name: 'Analytics',
        description: '📈 Data analysis, glucose trends, time-in-range, and health insights'
      },
      {
        name: 'Sensor Management',
        description: '🔬 CGM sensor tracking, placement, and lifecycle management'
      },
      {
        name: 'Insulin Tracking',
        description: '💉 Insulin dose logging, types, and administration tracking'
      }
    ],
    security: [
      {
        ApiKeyAuth: []
      },
      {
        BearerAuth: []
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Tip: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the tip'
            },
            title: {
              type: 'string',
              description: 'Title of the tip'
            },
            content: {
              type: 'string',
              description: 'Content of the tip in markdown format'
            },
            category: {
              type: 'string',
              enum: ['sensor-placement', 'troubleshooting', 'lifestyle', 'alerts', 'data-analysis', 'general'],
              description: 'Category of the tip'
            },
            author: {
              type: 'string',
              description: 'Name of the tip author'
            },
            stats: {
              type: 'object',
              properties: {
                upvotes: { type: 'integer', description: 'Number of upvotes' },
                downvotes: { type: 'integer', description: 'Number of downvotes' },
                netVotes: { type: 'integer', description: 'Net votes (upvotes - downvotes)' },
                comments: { type: 'integer', description: 'Number of comments' },
                views: { type: 'integer', description: 'Number of views' }
              }
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags associated with the tip'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the tip was created'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the tip was last updated'
            }
          }
        },
        Comment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the comment'
            },
            content: {
              type: 'string',
              description: 'Content of the comment'
            },
            author: {
              type: 'string',
              description: 'Name of the comment author'
            },
            stats: {
              type: 'object',
              properties: {
                upvotes: { type: 'integer' },
                downvotes: { type: 'integer' },
                netVotes: { type: 'integer' }
              }
            },
            parentId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              description: 'ID of parent comment if this is a reply'
            },
            replies: {
              type: 'array',
              items: { $ref: '#/components/schemas/Comment' },
              description: 'Nested replies to this comment'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', description: 'Current page number' },
            limit: { type: 'integer', description: 'Number of items per page' },
            total: { type: 'integer', description: 'Total number of items' },
            pages: { type: 'integer', description: 'Total number of pages' },
            hasNext: { type: 'boolean', description: 'Whether there is a next page' },
            hasPrev: { type: 'boolean', description: 'Whether there is a previous page' }
          }
        },
        ApiMeta: {
          type: 'object',
          properties: {
            responseTime: { type: 'string', description: 'Response time in milliseconds' },
            apiVersion: { type: 'string', description: 'API version' },
            rateLimit: {
              type: 'object',
              properties: {
                limit: { type: 'string', description: 'Rate limit maximum' },
                remaining: { type: 'string', description: 'Remaining requests' },
                reset: { type: 'string', description: 'Rate limit reset time (Unix timestamp)' }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Error type' },
            message: { type: 'string', description: 'Human-readable error message' }
          }
        },
        GlucoseReading: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            value: { type: 'number', description: 'Glucose value in mg/dL' },
            timestamp: { type: 'string', format: 'date-time' },
            trend: { 
              type: 'string', 
              enum: ['rising_rapidly', 'rising', 'stable', 'falling', 'falling_rapidly'],
              description: 'Glucose trend direction'
            },
            source: { type: 'string', enum: ['dexcom', 'freestyle', 'manual'] }
          }
        },
        FoodItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            brand: { type: 'string', nullable: true },
            barcode: { type: 'string', nullable: true },
            nutrition: {
              type: 'object',
              properties: {
                calories: { type: 'number' },
                carbs: { type: 'number' },
                protein: { type: 'number' },
                fat: { type: 'number' },
                fiber: { type: 'number', nullable: true },
                sugar: { type: 'number', nullable: true },
                sodium: { type: 'number', nullable: true }
              }
            },
            serving_size: { type: 'number' },
            serving_unit: { type: 'string' },
            is_custom: { type: 'boolean' },
            is_public: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        FoodLog: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            food_item: { $ref: '#/components/schemas/FoodItem' },
            serving_size: { type: 'number' },
            serving_unit: { type: 'string' },
            meal_type: { 
              type: 'string', 
              enum: ['breakfast', 'lunch', 'dinner', 'snack', 'other'] 
            },
            logged_at: { type: 'string', format: 'date-time' },
            notes: { type: 'string', nullable: true },
            nutrition_totals: {
              type: 'object',
              properties: {
                calories: { type: 'number' },
                carbs: { type: 'number' },
                protein: { type: 'number' },
                fat: { type: 'number' }
              }
            }
          }
        },
        InsulinDose: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            insulin_type: { type: 'string' },
            units: { type: 'number' },
            dose_type: { 
              type: 'string', 
              enum: ['basal', 'bolus', 'correction'] 
            },
            administered_at: { type: 'string', format: 'date-time' },
            notes: { type: 'string', nullable: true }
          }
        },
        Sensor: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            model: { type: 'string' },
            serial_number: { type: 'string' },
            placement_site: { type: 'string' },
            inserted_at: { type: 'string', format: 'date-time' },
            expires_at: { type: 'string', format: 'date-time' },
            status: { 
              type: 'string', 
              enum: ['active', 'expired', 'removed', 'failed'] 
            },
            tags: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    },
    paths: {
      // Community API
      '/community/categories': {
        get: {
          tags: ['Community'],
          summary: 'Get community categories',
          description: 'Retrieve all available community tip categories',
          responses: {
            '200': {
              description: 'List of categories',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            description: { type: 'string' },
                            count: { type: 'integer' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/community/tips': {
        get: {
          tags: ['Community'],
          summary: 'List community tips',
          description: 'Retrieve a paginated list of community tips with optional filtering',
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 },
              description: 'Page number for pagination'
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20, maximum: 100 },
              description: 'Number of items per page (max 100)'
            },
            {
              name: 'category',
              in: 'query',
              schema: { 
                type: 'string',
                enum: ['sensor-placement', 'troubleshooting', 'lifestyle', 'alerts', 'data-analysis', 'general']
              },
              description: 'Filter by category'
            },
            {
              name: 'search',
              in: 'query',
              schema: { type: 'string' },
              description: 'Search in title and content'
            },
            {
              name: 'sort',
              in: 'query',
              schema: { 
                type: 'string',
                enum: ['created_at', 'updated_at', 'upvotes', 'view_count', 'comment_count'],
                default: 'created_at'
              },
              description: 'Sort field'
            },
            {
              name: 'order',
              in: 'query',
              schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
              description: 'Sort order'
            }
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Tip' }
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                      meta: { $ref: '#/components/schemas/ApiMeta' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Community'],
          summary: 'Create community tip',
          description: 'Create a new community tip to share with other users',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { 
                      type: 'string', 
                      maxLength: 200,
                      description: 'Title of the tip (max 200 characters)' 
                    },
                    content: { 
                      type: 'string', 
                      maxLength: 10000,
                      description: 'Content of the tip in markdown format (max 10,000 characters)' 
                    },
                    category: {
                      type: 'string',
                      enum: ['sensor-placement', 'troubleshooting', 'lifestyle', 'alerts', 'data-analysis', 'general'],
                      description: 'Category of the tip'
                    },
                    tags: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Optional tags for the tip'
                    },
                    is_anonymous: {
                      type: 'boolean',
                      default: false,
                      description: 'Whether to post anonymously'
                    }
                  },
                  required: ['title', 'content', 'category']
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Tip created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Tip' },
                      meta: { $ref: '#/components/schemas/ApiMeta' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/community/tips/{tipId}': {
        get: {
          tags: ['Community'],
          summary: 'Get specific tip',
          description: 'Retrieve a specific tip by ID, optionally including comments',
          parameters: [
            {
              name: 'tipId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'Unique identifier of the tip'
            },
            {
              name: 'include_comments',
              in: 'query',
              schema: { type: 'boolean', default: false },
              description: 'Include comments in the response'
            }
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Tip' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/community/comments': {
        get: {
          tags: ['Community'],
          summary: 'List comments',
          description: 'Retrieve comments with optional filtering by tip ID',
          parameters: [
            {
              name: 'tip_id',
              in: 'query',
              schema: { type: 'string', format: 'uuid' },
              description: 'Filter comments by tip ID'
            },
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 }
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20, maximum: 100 }
            }
          ],
          responses: {
            '200': {
              description: 'List of comments',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Comment' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/community/search': {
        get: {
          tags: ['Community'],
          summary: 'Search community content',
          description: 'Search across tips and comments',
          parameters: [
            {
              name: 'q',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              description: 'Search query'
            },
            {
              name: 'type',
              in: 'query',
              schema: { type: 'string', enum: ['tips', 'comments', 'all'], default: 'all' },
              description: 'Content type to search'
            }
          ],
          responses: {
            '200': {
              description: 'Search results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          tips: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Tip' }
                          },
                          comments: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Comment' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      // Authentication API
      '/auth/api-keys': {
        get: {
          tags: ['Authentication'],
          summary: 'List API keys',
          description: 'Get user\'s API keys',
          security: [{ BearerAuth: [] }],
          responses: {
            '200': {
              description: 'List of API keys',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      keys: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            key_preview: { type: 'string' },
                            created_at: { type: 'string', format: 'date-time' },
                            last_used_at: { type: 'string', format: 'date-time', nullable: true },
                            is_active: { type: 'boolean' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Authentication'],
          summary: 'Create API key',
          description: 'Create a new API key',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Name for the API key' }
                  },
                  required: ['name']
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'API key created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      key: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          key: { type: 'string', description: 'Full API key (only shown once)' },
                          created_at: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/auth/usage': {
        get: {
          tags: ['Authentication'],
          summary: 'Get API usage statistics',
          description: 'Get usage statistics for the authenticated user',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          responses: {
            '200': {
              description: 'Usage statistics',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      usage: {
                        type: 'object',
                        properties: {
                          requests_today: { type: 'integer' },
                          requests_this_month: { type: 'integer' },
                          rate_limit: {
                            type: 'object',
                            properties: {
                              limit: { type: 'integer' },
                              remaining: { type: 'integer' },
                              reset_time: { type: 'string', format: 'date-time' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      // Glucose Data API
      '/glucose/readings': {
        get: {
          tags: ['Glucose Data'],
          summary: 'Get glucose readings',
          description: 'Retrieve glucose readings with optional date filtering',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          parameters: [
            {
              name: 'start_date',
              in: 'query',
              schema: { type: 'string', format: 'date-time' },
              description: 'Start date for filtering readings'
            },
            {
              name: 'end_date',
              in: 'query',
              schema: { type: 'string', format: 'date-time' },
              description: 'End date for filtering readings'
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 100, maximum: 1000 },
              description: 'Maximum number of readings to return'
            },
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 },
              description: 'Page number for pagination'
            }
          ],
          responses: {
            '200': {
              description: 'List of glucose readings',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/GlucoseReading' }
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Glucose Data'],
          summary: 'Add glucose reading',
          description: 'Add a new glucose reading (manual entry)',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    value: { type: 'number', minimum: 20, maximum: 600, description: 'Glucose value in mg/dL' },
                    timestamp: { type: 'string', format: 'date-time' },
                    trend: { 
                      type: 'string', 
                      enum: ['rising_rapidly', 'rising', 'stable', 'falling', 'falling_rapidly'],
                      description: 'Optional trend indicator'
                    },
                    source: { type: 'string', enum: ['manual', 'dexcom', 'freestyle'], default: 'manual' }
                  },
                  required: ['value', 'timestamp']
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Glucose reading created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/GlucoseReading' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      // Food Logging API
      '/food/logs': {
        get: {
          tags: ['Food Logging'],
          summary: 'Get food logs',
          description: 'Retrieve food logs with optional filtering',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          parameters: [
            {
              name: 'date',
              in: 'query',
              schema: { type: 'string', format: 'date' },
              description: 'Filter by specific date (YYYY-MM-DD)'
            },
            {
              name: 'meal_type',
              in: 'query',
              schema: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack', 'other'] },
              description: 'Filter by meal type'
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 50, maximum: 100 }
            },
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 }
            }
          ],
          responses: {
            '200': {
              description: 'List of food logs with nutrition totals',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/FoodLog' }
                      },
                      totals: {
                        type: 'object',
                        properties: {
                          calories: { type: 'number' },
                          carbs: { type: 'number' },
                          protein: { type: 'number' },
                          fat: { type: 'number' }
                        }
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Food Logging'],
          summary: 'Log food consumption',
          description: 'Create a new food log entry',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    food_item_id: { type: 'string', format: 'uuid' },
                    serving_size: { type: 'number', default: 100 },
                    serving_unit: { type: 'string', default: 'g' },
                    meal_type: { 
                      type: 'string', 
                      enum: ['breakfast', 'lunch', 'dinner', 'snack', 'other'],
                      default: 'snack'
                    },
                    logged_at: { type: 'string', format: 'date-time' },
                    notes: { type: 'string' }
                  },
                  required: ['food_item_id']
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Food log created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/FoodLog' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      // Analytics API
      '/analytics/glucose-trends': {
        get: {
          tags: ['Analytics'],
          summary: 'Get glucose trends and analytics',
          description: 'Retrieve glucose statistics, time-in-range, and optional food correlations',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          parameters: [
            {
              name: 'period',
              in: 'query',
              schema: { type: 'string', enum: ['1d', '7d', '30d', '90d'], default: '7d' },
              description: 'Time period for analysis'
            },
            {
              name: 'include_food',
              in: 'query',
              schema: { type: 'boolean', default: false },
              description: 'Include food correlation analysis'
            }
          ],
          responses: {
            '200': {
              description: 'Glucose trends and analytics',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          period: { type: 'string' },
                          dateRange: {
                            type: 'object',
                            properties: {
                              start: { type: 'string', format: 'date-time' },
                              end: { type: 'string', format: 'date-time' }
                            }
                          },
                          statistics: {
                            type: 'object',
                            properties: {
                              count: { type: 'integer' },
                              average: { type: 'number' },
                              min: { type: 'number' },
                              max: { type: 'number' },
                              timeInRange: {
                                type: 'object',
                                properties: {
                                  veryLow: { type: 'integer', description: 'Percentage < 54 mg/dL' },
                                  low: { type: 'integer', description: 'Percentage 54-69 mg/dL' },
                                  target: { type: 'integer', description: 'Percentage 70-180 mg/dL' },
                                  high: { type: 'integer', description: 'Percentage 181-250 mg/dL' },
                                  veryHigh: { type: 'integer', description: 'Percentage > 250 mg/dL' }
                                }
                              }
                            }
                          },
                          readings: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/GlucoseReading' }
                          },
                          foodCorrelations: {
                            type: 'object',
                            nullable: true,
                            description: 'Food impact analysis (only if include_food=true)'
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      // Food Search API
      '/food/search': {
        get: {
          tags: ['Food Logging'],
          summary: 'Search food database',
          description: 'Search for foods in the database including custom foods',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          parameters: [
            {
              name: 'q',
              in: 'query',
              required: true,
              schema: { type: 'string', minLength: 2 },
              description: 'Search query (minimum 2 characters)'
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20, maximum: 100 },
              description: 'Maximum number of results'
            },
            {
              name: 'include_custom',
              in: 'query',
              schema: { type: 'boolean', default: true },
              description: 'Include custom foods in results'
            }
          ],
          responses: {
            '200': {
              description: 'Search results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/FoodItem' }
                      },
                      query: { type: 'string' },
                      pagination: {
                        type: 'object',
                        properties: {
                          limit: { type: 'integer' },
                          total: { type: 'integer' },
                          hasMore: { type: 'boolean' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      // Sensor Management API
      '/sensors': {
        get: {
          tags: ['Sensor Management'],
          summary: 'List user sensors',
          description: 'Get user\'s CGM sensors with optional status filtering',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          parameters: [
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string', enum: ['active', 'expired', 'removed', 'failed'] },
              description: 'Filter by sensor status'
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 50, maximum: 100 }
            },
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 }
            }
          ],
          responses: {
            '200': {
              description: 'List of sensors with statistics',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Sensor' }
                      },
                      stats: {
                        type: 'object',
                        properties: {
                          total: { type: 'integer' },
                          active: { type: 'integer' },
                          expired: { type: 'integer' },
                          removed: { type: 'integer' },
                          failed: { type: 'integer' }
                        }
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Sensor Management'],
          summary: 'Add new sensor',
          description: 'Register a new CGM sensor',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    model: { type: 'string', description: 'Sensor model (e.g., Dexcom G7, FreeStyle Libre 3)' },
                    serial_number: { type: 'string', description: 'Serial number (optional)' },
                    placement_site: { type: 'string', description: 'Body placement location' },
                    inserted_at: { type: 'string', format: 'date-time', description: 'When sensor was inserted' },
                    expires_at: { type: 'string', format: 'date-time', description: 'When sensor expires (optional)' },
                    notes: { type: 'string', description: 'Additional notes (optional)' }
                  },
                  required: ['model', 'placement_site', 'inserted_at']
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Sensor created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Sensor' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      // Insulin Tracking API
      '/insulin/doses': {
        get: {
          tags: ['Insulin Tracking'],
          summary: 'Get insulin doses',
          description: 'Retrieve insulin dose history with optional filtering',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          parameters: [
            {
              name: 'start_date',
              in: 'query',
              schema: { type: 'string', format: 'date-time' },
              description: 'Start date for filtering'
            },
            {
              name: 'end_date',
              in: 'query',
              schema: { type: 'string', format: 'date-time' },
              description: 'End date for filtering'
            },
            {
              name: 'dose_type',
              in: 'query',
              schema: { type: 'string', enum: ['basal', 'bolus', 'correction'] },
              description: 'Filter by dose type'
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 100, maximum: 500 }
            },
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 }
            }
          ],
          responses: {
            '200': {
              description: 'List of insulin doses with statistics',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/InsulinDose' }
                      },
                      stats: {
                        type: 'object',
                        properties: {
                          total: { type: 'integer' },
                          totalUnits: { type: 'number' },
                          byType: {
                            type: 'object',
                            properties: {
                              basal: { type: 'number' },
                              bolus: { type: 'number' },
                              correction: { type: 'number' }
                            }
                          }
                        }
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Insulin Tracking'],
          summary: 'Log insulin dose',
          description: 'Record a new insulin dose administration',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    insulin_type: { type: 'string', description: 'Type of insulin (e.g., Humalog, Lantus)' },
                    units: { type: 'number', minimum: 0.1, maximum: 100, description: 'Units administered' },
                    dose_type: { 
                      type: 'string', 
                      enum: ['basal', 'bolus', 'correction'],
                      description: 'Type of dose'
                    },
                    administered_at: { type: 'string', format: 'date-time', description: 'When dose was given' },
                    notes: { type: 'string', description: 'Additional notes (optional)' }
                  },
                  required: ['insulin_type', 'units', 'dose_type', 'administered_at']
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Insulin dose logged successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/InsulinDose' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      // NEW HIGH-PRIORITY ENDPOINTS
      '/community/tips/{tipId}/vote': {
        post: {
          tags: ['Community'],
          summary: 'Vote on community tip',
          description: 'Cast an upvote or downvote on a community tip',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          parameters: [
            {
              name: 'tipId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'The tip ID to vote on'
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    vote_type: {
                      type: 'string',
                      enum: ['upvote', 'downvote'],
                      description: 'Type of vote to cast'
                    }
                  },
                  required: ['vote_type']
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Vote cast successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' },
                      data: {
                        type: 'object',
                        properties: {
                          vote_id: { type: 'string', format: 'uuid' },
                          vote_type: { type: 'string' },
                          tip_votes: {
                            type: 'object',
                            properties: {
                              upvotes: { type: 'integer' },
                              downvotes: { type: 'integer' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        delete: {
          tags: ['Community'],
          summary: 'Remove vote from tip',
          description: 'Remove your vote from a community tip',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          parameters: [
            {
              name: 'tipId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          responses: {
            '200': {
              description: 'Vote removed successfully'
            }
          }
        }
      },
      '/analytics/daily-summary': {
        get: {
          tags: ['Analytics'],
          summary: 'Get daily glucose and activity summary',
          description: 'Comprehensive daily summary including glucose stats, food logs, and insights',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          parameters: [
            {
              name: 'date',
              in: 'query',
              schema: { type: 'string', format: 'date' },
              description: 'Date for summary (YYYY-MM-DD). Defaults to today'
            },
            {
              name: 'timezone',
              in: 'query',
              schema: { type: 'string' },
              description: 'Timezone for date calculations'
            }
          ],
          responses: {
            '200': {
              description: 'Daily summary with glucose stats, food logs, and insights',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          date: { type: 'string', format: 'date' },
                          glucose_stats: {
                            type: 'object',
                            properties: {
                              average: { type: 'number' },
                              min: { type: 'number' },
                              max: { type: 'number' },
                              readings_count: { type: 'integer' },
                              time_in_range: {
                                type: 'object',
                                properties: {
                                  percentage: { type: 'number' },
                                  minutes: { type: 'integer' }
                                }
                              }
                            }
                          },
                          food_summary: {
                            type: 'object',
                            properties: {
                              total_meals: { type: 'integer' },
                              total_carbs: { type: 'number' },
                              total_calories: { type: 'number' }
                            }
                          },
                          insights: {
                            type: 'object',
                            properties: {
                              glucose_trends: { type: 'array', items: { type: 'string' } },
                              recommendations: { type: 'array', items: { type: 'string' } },
                              alerts: { type: 'array', items: { type: 'object' } }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/food/barcode/{barcode}': {
        get: {
          tags: ['Food Logging'],
          summary: 'Get food item by barcode',
          description: 'Retrieve food information using barcode scanning (UPC/EAN)',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          parameters: [
            {
              name: 'barcode',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'The barcode number (UPC/EAN)'
            },
            {
              name: 'fallback_api',
              in: 'query',
              schema: { type: 'boolean', default: true },
              description: 'Whether to use external API if not found in database'
            }
          ],
          responses: {
            '200': {
              description: 'Food item found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        allOf: [
                          { $ref: '#/components/schemas/FoodItem' },
                          {
                            type: 'object',
                            properties: {
                              source: { type: 'string', enum: ['database', 'openfoodfacts', 'usda'] },
                              confidence: { type: 'number', description: 'Confidence score (0-1)' }
                            }
                          }
                        ]
                      }
                    }
                  }
                }
              }
            },
            '404': {
              description: 'Food item not found for this barcode'
            }
          }
        }
      },
      '/food/favorites': {
        get: {
          tags: ['Food Logging'],
          summary: 'Get user\'s favorite foods',
          description: 'Retrieve list of user\'s favorite food items for quick logging',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          parameters: [
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20, maximum: 100 }
            },
            {
              name: 'search',
              in: 'query',
              schema: { type: 'string' },
              description: 'Search within favorite foods'
            }
          ],
          responses: {
            '200': {
              description: 'List of favorite foods',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            food_item: { $ref: '#/components/schemas/FoodItem' },
                            favorite_name: { type: 'string' },
                            default_quantity: { type: 'number' },
                            usage_count: { type: 'integer' },
                            last_used: { type: 'string', format: 'date-time' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Food Logging'],
          summary: 'Add food to favorites',
          description: 'Add a food item to user\'s favorites list',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    food_item_id: { type: 'string', format: 'uuid' },
                    favorite_name: { type: 'string', description: 'Custom name (optional)' },
                    default_quantity: { type: 'number', default: 100 }
                  },
                  required: ['food_item_id']
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Food added to favorites successfully'
            }
          }
        }
      },
      '/food/favorites/{favoriteId}': {
        get: {
          tags: ['Food Logging'],
          summary: 'Get specific favorite food',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          parameters: [
            {
              name: 'favoriteId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          responses: {
            '200': {
              description: 'Favorite food details'
            }
          }
        },
        put: {
          tags: ['Food Logging'],
          summary: 'Update favorite food',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          parameters: [
            {
              name: 'favoriteId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    favorite_name: { type: 'string' },
                    default_quantity: { type: 'number' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Favorite updated successfully'
            }
          }
        },
        delete: {
          tags: ['Food Logging'],
          summary: 'Remove food from favorites',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          parameters: [
            {
              name: 'favoriteId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' }
            }
          ],
          responses: {
            '200': {
              description: 'Favorite removed successfully'
            }
          }
        }
      },
      '/export/glucose': {
        get: {
          tags: ['Analytics'],
          summary: 'Export glucose data',
          description: 'Export glucose readings in various formats for healthcare providers',
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          parameters: [
            {
              name: 'format',
              in: 'query',
              schema: { type: 'string', enum: ['csv', 'json', 'pdf'], default: 'csv' }
            },
            {
              name: 'start_date',
              in: 'query',
              schema: { type: 'string', format: 'date' }
            },
            {
              name: 'end_date',
              in: 'query',
              schema: { type: 'string', format: 'date' }
            },
            {
              name: 'include_food_logs',
              in: 'query',
              schema: { type: 'boolean', default: false }
            },
            {
              name: 'include_statistics',
              in: 'query',
              schema: { type: 'boolean', default: true }
            }
          ],
          responses: {
            '200': {
              description: 'Export generated successfully',
              content: {
                'text/csv': {
                  schema: { type: 'string' }
                },
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          export_info: { type: 'object' },
                          statistics: { type: 'object' },
                          glucose_readings: { type: 'array' },
                          food_logs: { type: 'array' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  if (format === 'yaml') {
    // Convert to YAML (simplified - in production use a proper YAML library)
    return new Response(JSON.stringify(openApiSpec, null, 2), {
      headers: {
        'Content-Type': 'application/x-yaml',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  return NextResponse.json(openApiSpec, {
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  });
}
