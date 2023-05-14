"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assertions_1 = require("aws-cdk-lib/assertions");
const cdk = require("aws-cdk-lib");
const TheSagaStepfunction = require("../lib/cdk-serverless-saga-stack");
let template;
beforeAll(() => {
    const app = new cdk.App();
    const stack = new TheSagaStepfunction.CdkServerlessSagaStack(app, 'MyTestStack');
    template = assertions_1.Template.fromStack(stack);
});
test('API Gateway Proxy Created', () => {
    template.hasResourceProperties("AWS::ApiGateway::Resource", {
        "PathPart": "{proxy+}"
    });
});
test('9 Lambda Functions Created', () => {
    template.resourceCountIs("AWS::Lambda::Function", 9);
});
test('Saga Lambda Permissions To Execute StepFunction', () => {
    template.hasResourceProperties("AWS::IAM::Policy", {
        "PolicyDocument": {
            "Statement": [{
                    "Action": "states:StartExecution",
                    "Effect": "Allow"
                }]
        }
    });
});
test('3 DynamoDB Tables Created', () => {
    template.resourceCountIs("AWS::DynamoDB::Table", 3);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2RrLXNlcnZlcmxlc3Mtc2FnYS50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdGVzdC9jZGstc2VydmVybGVzcy1zYWdhLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx1REFBeUQ7QUFDekQsbUNBQW1DO0FBQ25DLHdFQUF5RTtBQUV6RSxJQUFJLFFBQWtCLENBQUM7QUFFdkIsU0FBUyxDQUFDLEdBQUcsRUFBRTtJQUNiLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzFCLE1BQU0sS0FBSyxHQUFHLElBQUksbUJBQW1CLENBQUMsc0JBQXNCLENBQUMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQ2pGLFFBQVEsR0FBRyxxQkFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7SUFDckMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLDJCQUEyQixFQUFFO1FBQzFELFVBQVUsRUFBRSxVQUFVO0tBQ3ZCLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtJQUN0QyxRQUFRLENBQUMsZUFBZSxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3ZELENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLGlEQUFpRCxFQUFFLEdBQUcsRUFBRTtJQUMzRCxRQUFRLENBQUMscUJBQXFCLENBQUMsa0JBQWtCLEVBQUU7UUFDakQsZ0JBQWdCLEVBQUU7WUFDaEIsV0FBVyxFQUFFLENBQUM7b0JBQ1osUUFBUSxFQUFFLHVCQUF1QjtvQkFDakMsUUFBUSxFQUFFLE9BQU87aUJBQ2xCLENBQUM7U0FDSDtLQUNGLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtJQUNyQyxRQUFRLENBQUMsZUFBZSxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3RELENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVGVtcGxhdGUsIE1hdGNoIH0gZnJvbSAnYXdzLWNkay1saWIvYXNzZXJ0aW9ucyc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IFRoZVNhZ2FTdGVwZnVuY3Rpb24gPSByZXF1aXJlKCcuLi9saWIvY2RrLXNlcnZlcmxlc3Mtc2FnYS1zdGFjaycpO1xuXG5sZXQgdGVtcGxhdGU6IFRlbXBsYXRlO1xuXG5iZWZvcmVBbGwoKCkgPT4ge1xuICBjb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuICBjb25zdCBzdGFjayA9IG5ldyBUaGVTYWdhU3RlcGZ1bmN0aW9uLkNka1NlcnZlcmxlc3NTYWdhU3RhY2soYXBwLCAnTXlUZXN0U3RhY2snKTtcbiAgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xufSk7XG5cbnRlc3QoJ0FQSSBHYXRld2F5IFByb3h5IENyZWF0ZWQnLCAoKSA9PiB7XG4gIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcyhcIkFXUzo6QXBpR2F0ZXdheTo6UmVzb3VyY2VcIiwge1xuICAgIFwiUGF0aFBhcnRcIjogXCJ7cHJveHkrfVwiXG4gIH0pO1xufSk7XG5cbnRlc3QoJzkgTGFtYmRhIEZ1bmN0aW9ucyBDcmVhdGVkJywgKCkgPT4ge1xuICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoXCJBV1M6OkxhbWJkYTo6RnVuY3Rpb25cIiwgOSk7XG59KTtcblxudGVzdCgnU2FnYSBMYW1iZGEgUGVybWlzc2lvbnMgVG8gRXhlY3V0ZSBTdGVwRnVuY3Rpb24nLCAoKSA9PiB7XG4gIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcyhcIkFXUzo6SUFNOjpQb2xpY3lcIiwge1xuICAgIFwiUG9saWN5RG9jdW1lbnRcIjoge1xuICAgICAgXCJTdGF0ZW1lbnRcIjogW3tcbiAgICAgICAgXCJBY3Rpb25cIjogXCJzdGF0ZXM6U3RhcnRFeGVjdXRpb25cIixcbiAgICAgICAgXCJFZmZlY3RcIjogXCJBbGxvd1wiXG4gICAgICB9XVxuICAgIH1cbiAgfSk7XG59KTtcblxudGVzdCgnMyBEeW5hbW9EQiBUYWJsZXMgQ3JlYXRlZCcsICgpID0+IHtcbiAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKFwiQVdTOjpEeW5hbW9EQjo6VGFibGVcIiwgMyk7XG59KTtcblxuIl19