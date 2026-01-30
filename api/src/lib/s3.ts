import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

export const uploadToS3 = async (
  bucket: string,
  key: string,
  body: Buffer | Uint8Array | Blob | string,
  contentType: string
) => {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType
  });

  try {
    const result = await s3Client.send(command);
    return {
      success: true,
      etag: result.ETag,
      location: `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw error;
  }
};

export const getFromS3 = async (bucket: string, key: string) => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });

  try {
    const result = await s3Client.send(command);
    return result.Body;
  } catch (error) {
    console.error('S3 get error:', error);
    throw error;
  }
};

export const deleteFromS3 = async (bucket: string, key: string) => {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key
  });

  try {
    await s3Client.send(command);
    return { success: true };
  } catch (error) {
    console.error('S3 delete error:', error);
    throw error;
  }
};

export const getPresignedUrl = async (bucket: string, key: string, expiresIn: number = 3600) => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Presigned URL error:', error);
    throw error;
  }
};

export default s3Client;
