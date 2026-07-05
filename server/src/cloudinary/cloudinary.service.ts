import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  uploadImage(file: Express.Multer.File): Promise<{ secure_url: string }> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'image' },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({ secure_url: result.secure_url });
          } else {
            reject(new Error('Upload failed: no result'));
          }
        },
      );
      streamifier.createReadStream(file.buffer).pipe(stream);
    });
  }
}
