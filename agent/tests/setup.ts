import dotenv from 'dotenv';

dotenv.config();

process.env.NODE_ENV = 'test';

jest.setTimeout(120000);
