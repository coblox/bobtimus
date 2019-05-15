import { StartedTestContainer } from "testcontainers/dist/test-container";
import DoneCallback = jest.DoneCallback;

export default function containerTest<C extends StartedTestContainer>(
  containerFactory: () => Promise<C>,
  testFn: (container: C) => Promise<void>
) {
  return async (done: DoneCallback) => {
    const container = await containerFactory();

    try {
      await testFn(container);
      await container.stop();
      done();
    } catch (e) {
      await container.stop();
      done(e);
    }
  };
}
