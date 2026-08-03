// /**
//  * WriterAgent Unit Tests
//  */

// import { Test, TestingModule } from '@nestjs/testing';
// import { WriterAgent } from './writer.agent';
// import { AnalystResult } from '../analyst/analyst.agent';

// describe('WriterAgent', () => {
//   let agent: WriterAgent;

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [WriterAgent],
//     }).compile();

//     agent = module.get<WriterAgent>(WriterAgent);
//   });

//   it('should be defined', () => {
//     expect(agent).toBeDefined();
//   });

//   it('should have correct model ID', () => {
//     expect((agent as any).modelId).toBe('us.anthropic.claude-sonnet-4-5-20250929-v1:0');
//   });

//   it('should have Bedrock client initialized', () => {
//     expect((agent as any).bedrock).toBeDefined();
//   });

//   describe('execute', () => {
//     it('should fail if no analyst result is provided', async () => {
//       const result = await agent.execute({
//         organizationId: 'test-org',
//         researchJobId: 'test-job',
//         companyContext: 'Test context',
//         additionalParams: {},
//       });

//       expect(result.success).toBe(false);
//       expect(result.error).toContain('No analyst result provided');
//     });
//   });

//   describe('word counting', () => {
//     it('should count words correctly', () => {
//       const text = 'This is a test sentence with seven words';
//       const count = (agent as any).countWords(text);
//       expect(count).toBe(8);
//     });
//   });

//   describe('capitalize', () => {
//     it('should capitalize first letter', () => {
//       expect((agent as any).capitalize('hello')).toBe('Hello');
//       expect((agent as any).capitalize('world')).toBe('World');
//     });
//   });
// });
