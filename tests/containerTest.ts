import { StartedTestContainer } from "testcontainers/dist/test-container";
import DoneCallback = jest.DoneCallback;

export default function containerTest<
  C extends StartedTestContainer,
  P extends { container: C }
>(
  parameterFactory: () => Promise<P>,
  testFn: (parameters: P) => Promise<void>
) {
  return async (done: DoneCallback) => {
    const parameters = await parameterFactory();

    try {
      await testFn(parameters);
      await parameters.container.stop();
      done();
    } catch (e) {
      await parameters.container.stop();
      done(e);
    }
  };
}
