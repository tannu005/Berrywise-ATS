const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const logger = require('../utils/logger');

const parseResumeFile = async (filePath, mimeType) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    let text = '';

    if (mimeType === 'application/pdf' || filePath.endsWith('.pdf')) {
      logger.debug(`Parsing PDF resume: ${filePath}`);
      const data = await pdfParse(fileBuffer);
      text = data.text;
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      filePath.endsWith('.docx')
    ) {
      logger.debug(`Parsing DOCX resume: ${filePath}`);
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      text = result.value;
    } else {
      logger.debug(`Parsing text resume: ${filePath}`);
      text = fileBuffer.toString('utf-8');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Parsed text is empty or could not be extracted.');
    }

    return text;
  } catch (error) {
    logger.error(`Error parsing file ${filePath}: ${error.message}`);
    throw new Error(`Failed to parse resume: ${error.message}`);
  }
};

module.exports = {
  parseResumeFile
};
