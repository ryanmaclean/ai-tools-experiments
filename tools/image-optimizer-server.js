/**
 * MCP Server: Image Optimizer
 * 
 * Provides tools for optimizing and converting images
 * Part of AI Tools Lab MCP servers
 */

const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { promisify } = require('util');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Register CORS
fastify.register(cors, {
  origin: true
});

// Configuration
const PORT = process.env.IMAGE_OPTIMIZER_PORT || 3001;
const MAX_IMAGE_SIZE = process.env.MAX_IMAGE_SIZE || 5000000; // 5MB default

// Utility functions
const fileExists = promisify(fs.exists);
const mkdir = promisify(fs.mkdir);

// Ensure output directories exist
async function ensureDir(dirPath) {
  if (!await fileExists(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

// Routes

// Tool: optimize_image
fastify.post('/optimize_image', async (request, reply) => {
  const { image_path, quality = 80, output_path } = request.body;
  
  if (!image_path) {
    return reply.code(400).send({ error: 'image_path is required' });
  }
  
  try {
    // Check if input file exists
    if (!fs.existsSync(image_path)) {
      return reply.code(404).send({ error: 'Input file not found' });
    }
    
    // Determine output path
    const finalOutputPath = output_path || image_path.replace(/\.(jpg|jpeg|png|gif)$/i, '.optimized.$1');
    
    // Ensure output directory exists
    await ensureDir(path.dirname(finalOutputPath));
    
    // Get original file stats
    const originalStats = fs.statSync(image_path);
    
    // Optimize image with sharp
    await sharp(image_path)
      .jpeg({ quality: parseInt(quality), progressive: true })
      .toFile(finalOutputPath);
    
    // Get optimized file stats
    const optimizedStats = fs.statSync(finalOutputPath);
    
    // Calculate size reduction
    const originalSize = originalStats.size;
    const optimizedSize = optimizedStats.size;
    const reductionPercent = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);
    
    return {
      success: true,
      original_path: image_path,
      optimized_path: finalOutputPath,
      original_size: originalSize,
      optimized_size: optimizedSize,
      reduction_percent: reductionPercent,
      message: `Image optimized successfully: ${reductionPercent}% reduction in size`
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: error.message });
  }
});

// Tool: convert_to_webp
fastify.post('/convert_to_webp', async (request, reply) => {
  const { image_path, quality = 80, output_path } = request.body;
  
  if (!image_path) {
    return reply.code(400).send({ error: 'image_path is required' });
  }
  
  try {
    // Check if input file exists
    if (!fs.existsSync(image_path)) {
      return reply.code(404).send({ error: 'Input file not found' });
    }
    
    // Determine output path
    const finalOutputPath = output_path || image_path.replace(/\.[^/.]+$/, '.webp');
    
    // Ensure output directory exists
    await ensureDir(path.dirname(finalOutputPath));
    
    // Get original file stats
    const originalStats = fs.statSync(image_path);
    
    // Convert image to WebP
    await sharp(image_path)
      .webp({ quality: parseInt(quality) })
      .toFile(finalOutputPath);
    
    // Get WebP file stats
    const webpStats = fs.statSync(finalOutputPath);
    
    // Calculate size reduction
    const originalSize = originalStats.size;
    const webpSize = webpStats.size;
    const reductionPercent = ((originalSize - webpSize) / originalSize * 100).toFixed(2);
    
    return {
      success: true,
      original_path: image_path,
      webp_path: finalOutputPath,
      original_size: originalSize,
      webp_size: webpSize,
      reduction_percent: reductionPercent,
      message: `Image converted to WebP successfully: ${reductionPercent}% reduction in size`
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: error.message });
  }
});

// Tool: convert_to_avif
fastify.post('/convert_to_avif', async (request, reply) => {
  const { image_path, quality = 70, output_path } = request.body;
  
  if (!image_path) {
    return reply.code(400).send({ error: 'image_path is required' });
  }
  
  try {
    // Check if input file exists
    if (!fs.existsSync(image_path)) {
      return reply.code(404).send({ error: 'Input file not found' });
    }
    
    // Determine output path
    const finalOutputPath = output_path || image_path.replace(/\.[^/.]+$/, '.avif');
    
    // Ensure output directory exists
    await ensureDir(path.dirname(finalOutputPath));
    
    // Get original file stats
    const originalStats = fs.statSync(image_path);
    
    // Convert image to AVIF
    await sharp(image_path)
      .avif({ quality: parseInt(quality) })
      .toFile(finalOutputPath);
    
    // Get AVIF file stats
    const avifStats = fs.statSync(finalOutputPath);
    
    // Calculate size reduction
    const originalSize = originalStats.size;
    const avifSize = avifStats.size;
    const reductionPercent = ((originalSize - avifSize) / originalSize * 100).toFixed(2);
    
    return {
      success: true,
      original_path: image_path,
      avif_path: finalOutputPath,
      original_size: originalSize,
      avif_size: avifSize,
      reduction_percent: reductionPercent,
      message: `Image converted to AVIF successfully: ${reductionPercent}% reduction in size`
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: error.message });
  }
});

// Tool: analyze_image_size
fastify.post('/analyze_image_size', async (request, reply) => {
  const { image_path, target_size_kb = 100 } = request.body;
  
  if (!image_path) {
    return reply.code(400).send({ error: 'image_path is required' });
  }
  
  try {
    // Check if input file exists
    if (!fs.existsSync(image_path)) {
      return reply.code(404).send({ error: 'Input file not found' });
    }
    
    // Get image metadata
    const metadata = await sharp(image_path).metadata();
    
    // Get file stats
    const stats = fs.statSync(image_path);
    const fileSizeKb = stats.size / 1024;
    
    // Calculate optimal dimensions to reach target size
    // This is a simple estimation and may need refinement
    const aspectRatio = metadata.width / metadata.height;
    const targetRatio = fileSizeKb / target_size_kb;
    const scaleFactor = Math.sqrt(1 / targetRatio);
    
    const suggestedWidth = Math.round(metadata.width * scaleFactor);
    const suggestedHeight = Math.round(metadata.height * scaleFactor);
    
    // Suggest different formats based on content
    let suggestedFormats = [];
    
    if (metadata.hasAlpha) {
      suggestedFormats.push('WebP', 'PNG');
    } else if (metadata.pages && metadata.pages > 1) {
      suggestedFormats.push('Animated WebP', 'GIF');
    } else {
      suggestedFormats.push('WebP', 'AVIF', 'JPEG');
    }
    
    return {
      success: true,
      original_path: image_path,
      current: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size_kb: fileSizeKb.toFixed(2)
      },
      suggested: {
        width: suggestedWidth,
        height: suggestedHeight,
        formats: suggestedFormats
      },
      message: `Analysis complete. To achieve target size of ${target_size_kb}KB, consider resizing to ${suggestedWidth}x${suggestedHeight} and using ${suggestedFormats.join(' or ')}.`
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: error.message });
  }
});

// Resource: optimization/stats
fastify.get('/optimization/stats', async (request, reply) => {
  try {
    // In a real application, this would fetch statistics from a database
    // For this example, we'll return dummy data
    return {
      total_images_processed: 120,
      total_bytes_saved: 258794520,
      bytes_saved_mb: 246.8,
      average_reduction: "65.4%",
      formats: {
        webp: 75,
        avif: 32,
        jpeg: 13
      },
      last_processed: new Date().toISOString()
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: error.message });
  }
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🖼️  Image Optimizer MCP server running at http://localhost:${PORT}`);
    console.log('Available tools:');
    console.log('- /optimize_image');
    console.log('- /convert_to_webp');
    console.log('- /convert_to_avif');
    console.log('- /analyze_image_size');
    console.log('Available resources:');
    console.log('- /optimization/stats');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
