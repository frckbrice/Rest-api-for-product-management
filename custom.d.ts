declare namespace NodeJS {
    interface ProcessEnv {
      JWT_SECRET: string;
      NODE_ENV: string
    }
  }