type environmentType = 'production' | 'staging' | 'development';

const environment = (name: environmentType) => {
  return {
    isProduction(): boolean {
      return name === 'production';
    },
    isStaging(): boolean {
      return name === 'staging';
    },
    isDevelopment(): boolean {
      return name === 'development';
    },
    is(name: environmentType): boolean {
      switch (name) {
          case 'production':
            return this.isProduction();
          case 'staging':
            return this.isStaging();
          default:
            break;
        }
        return this.isDevelopment();
    },
    allow(names: environmentType[]): boolean {
      for (const name of names) {
        if (this.is(name)) {
          return true;
        }
      }
      return false;
    },
    deny(names: environmentType[]): boolean {
      for (const name of names) {
        if (this.is(name)) {
          return false;
        }
      }
      return true;
    }
  };
}
const verifyEnvironment = () => {
  if (!process.env.ENVIRONMENT) {
    throw new Error('ENVIRONMENT is not defined');
  }
  const names: environmentType[] = ['production', 'staging', 'development'];
  if(!names.includes(process.env.ENVIRONMENT as environmentType)){
    throw new Error('ENVIRONMENT is invalid');
  }
}

const getEnvironment = () => {
  return process.env.ENVIRONMENT as environmentType;
}

const env = () => {
  const name = getEnvironment();
  return environment(name);
}

export default env;
export {
  environmentType as envNameType,
  verifyEnvironment as verifyEnvName,
  getEnvironment as getEnvName
};
