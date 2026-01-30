import { TextractClient, AnalyzeDocumentCommand, GetDocumentAnalysisCommand, StartDocumentAnalysisCommand } from '@aws-sdk/client-textract';

const textractClient = new TextractClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

export interface OCRResult {
  text: string;
  confidence: number;
  tables?: any[];
  forms?: any[];
}

export const analyzeDocument = async (documentBytes: Buffer | Uint8Array): Promise<OCRResult> => {
  const command = new AnalyzeDocumentCommand({
    Document: {
      Bytes: documentBytes
    },
    FeatureTypes: ['TABLES', 'FORMS']
  });

  try {
    const result = await textractClient.send(command);
    
    // Extract text from blocks
    const textBlocks = result.Blocks?.filter(block => block.BlockType === 'LINE') || [];
    const text = textBlocks.map(block => block.Text).join('\n');
    
    // Calculate average confidence
    const totalConfidence = textBlocks.reduce((sum, block) => sum + (block.Confidence || 0), 0);
    const averageConfidence = textBlocks.length > 0 ? totalConfidence / textBlocks.length : 0;

    // Extract tables if present
    const tables = result.Blocks?.filter(block => block.BlockType === 'TABLE') || [];
    
    // Extract forms if present
    const forms = result.Blocks?.filter(block => block.BlockType === 'KEY_VALUE_SET') || [];

    return {
      text,
      confidence: averageConfidence / 100, // Convert to 0-1 scale
      tables: tables.length > 0 ? tables : undefined,
      forms: forms.length > 0 ? forms : undefined
    };
  } catch (error) {
    console.error('Textract analysis error:', error);
    throw error;
  }
};

export const startDocumentAnalysis = async (documentLocation: { S3Object: { Bucket: string; Name: string } }) => {
  const command = new StartDocumentAnalysisCommand({
    DocumentLocation: documentLocation,
    FeatureTypes: ['TABLES', 'FORMS'],
    NotificationChannel: {
      SNSTopicArn: process.env.SNS_TOPIC_ARN || '',
      RoleArn: process.env.SNS_ROLE_ARN || ''
    }
  });

  try {
    const result = await textractClient.send(command);
    return result.JobId;
  } catch (error) {
    console.error('Start document analysis error:', error);
    throw error;
  }
};

export const getDocumentAnalysisResults = async (jobId: string) => {
  const command = new GetDocumentAnalysisCommand({
    JobId: jobId
  });

  try {
    const result = await textractClient.send(command);
    return result;
  } catch (error) {
    console.error('Get document analysis error:', error);
    throw error;
  }
};

export default textractClient;
