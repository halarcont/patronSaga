"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateMachine = void 0;
const constructs_1 = require("constructs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const lambda = require("aws-cdk-lib/aws-lambda");
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const sfn = require("aws-cdk-lib/aws-stepfunctions");
const tasks = require("aws-cdk-lib/aws-stepfunctions-tasks");
const sns = require("aws-cdk-lib/aws-sns");
const subscriptions = require("aws-cdk-lib/aws-sns-subscriptions");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const apigw = require("aws-cdk-lib/aws-apigateway");
const path_1 = require("path");
class StateMachine extends constructs_1.Construct {
    constructor(scope, id) {
        super(scope, id);
        /**
         * Create Dynamo DB tables which holds flights and car rentals reservations as well as payments information
         */
        const flightTable = new dynamodb.Table(this, 'Flights', {
            partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        const rentalTable = new dynamodb.Table(this, 'Rentals', {
            partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        const paymentTable = new dynamodb.Table(this, 'Payments', {
            partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        /**
         * Create Lambda Functions for booking and cancellation of services.
         */
        // Flights 
        let reserveFlightLambda = this.createLambda(this, 'reserveFlightLambdaHandler', 'flights/reserveFlight.ts', flightTable);
        let confirmFlightLambda = this.createLambda(this, 'confirmFlightLambdaHandler', 'flights/confirmFlight.ts', flightTable);
        let cancelFlightLambda = this.createLambda(this, 'cancelFlightLambdaHandler', 'flights/cancelFlight.ts', flightTable);
        // Car Rentals 
        let reserveRentalLambda = this.createLambda(this, 'reserveRentalLambdaHandler', 'rentals/reserveRental.ts', rentalTable);
        let confirmRentalLambda = this.createLambda(this, 'confirmRentalLambdaHandler', 'rentals/confirmRental.ts', rentalTable);
        let cancelRentalLambda = this.createLambda(this, 'cancelRentalLambdaHandler', 'rentals/cancelRental.ts', rentalTable);
        // Payment 
        let processPaymentLambda = this.createLambda(this, 'processPaymentLambdaHandler', 'payment/processPayment.ts', paymentTable);
        let refundPaymentLambda = this.createLambda(this, 'refundPaymentLambdaHandler', 'payment/refundPayment.ts', paymentTable);
        /**
       * Saga Pattern StepFunction
       * 1) Reserve Flight
       * 2) Reserve Car Rental
       * 2) Take Payment
       * 3) Confirm Flight and Car Rental reservation
       */
        // final states - success or failure 
        const reservationFailed = new sfn.Fail(this, "Reservation Failed", { error: 'Job Failed' });
        const reservationSucceeded = new sfn.Succeed(this, "Reservation Successful!");
        // SNS Topic, Subscription configuration
        const topic = new sns.Topic(this, 'Topic');
        topic.addSubscription(new subscriptions.SmsSubscription('+11111111111'));
        const snsNotificationFailure = new tasks.SnsPublish(this, 'SendingSMSFailure', {
            topic: topic,
            integrationPattern: sfn.IntegrationPattern.REQUEST_RESPONSE,
            message: sfn.TaskInput.fromText('Your Travel Reservation Failed'),
        });
        const snsNotificationSuccess = new tasks.SnsPublish(this, 'SendingSMSSuccess', {
            topic: topic,
            integrationPattern: sfn.IntegrationPattern.REQUEST_RESPONSE,
            message: sfn.TaskInput.fromText('Your Travel Reservation is Successful'),
        });
        /**
         * Reserve Flights
         */
        const cancelFlightReservation = new tasks.LambdaInvoke(this, 'CancelFlightReservation', {
            lambdaFunction: cancelFlightLambda,
            resultPath: '$.CancelFlightReservationResult',
        }).addRetry({ maxAttempts: 3 })
            .next(snsNotificationFailure) // retry this task a max of 3 times if it fails
            .next(reservationFailed);
        const reserveFlight = new tasks.LambdaInvoke(this, 'ReserveFlight', {
            lambdaFunction: reserveFlightLambda,
            resultPath: '$.ReserveFlightResult',
        }).addCatch(cancelFlightReservation, {
            resultPath: "$.ReserveFlightError"
        });
        /**
       * Reserve Car Rentals
       */
        const cancelRentalReservation = new tasks.LambdaInvoke(this, 'CancelRentalReservation', {
            lambdaFunction: cancelRentalLambda,
            resultPath: '$.CancelRentalReservationResult',
        }).addRetry({ maxAttempts: 3 }) // retry this task a max of 3 times if it fails
            .next(cancelFlightReservation);
        const reserveCarRental = new tasks.LambdaInvoke(this, 'ReserveCarRental', {
            lambdaFunction: reserveRentalLambda,
            resultPath: '$.ReserveCarRentalResult',
        }).addCatch(cancelRentalReservation, {
            resultPath: "$.ReserveCarRentalError"
        });
        /**
         * Payment
         */
        const refundPayment = new tasks.LambdaInvoke(this, 'RefundPayment', {
            lambdaFunction: refundPaymentLambda,
            resultPath: '$.RefundPaymentResult',
        }).addRetry({ maxAttempts: 3 }) // retry this task a max of 3 times if it fails
            .next(cancelRentalReservation);
        const processPayment = new tasks.LambdaInvoke(this, 'ProcessPayment', {
            lambdaFunction: processPaymentLambda,
            resultPath: '$.ProcessPaymentResult',
        }).addCatch(refundPayment, {
            resultPath: "$.ProcessPaymentError"
        });
        /**
         * Confirm Flight and Car Rental reservation
         */
        const confirmFlight = new tasks.LambdaInvoke(this, 'ConfirmFlight', {
            lambdaFunction: confirmFlightLambda,
            resultPath: '$.ConfirmFlightResult',
        }).addCatch(refundPayment, {
            resultPath: "$.ConfirmFlightError"
        });
        const confirmCarRental = new tasks.LambdaInvoke(this, 'ConfirmCarRental', {
            lambdaFunction: confirmRentalLambda,
            resultPath: '$.ConfirmCarRentalResult',
        }).addCatch(refundPayment, {
            resultPath: "$.ConfirmCarRentalError"
        });
        //Step function definition
        const definition = sfn.Chain
            .start(reserveFlight)
            .next(reserveCarRental)
            .next(processPayment)
            .next(confirmFlight)
            .next(confirmCarRental)
            .next(snsNotificationSuccess)
            .next(reservationSucceeded);
        let saga = new sfn.StateMachine(this, "StateMachine", {
            definition,
        });
        // AWS Lambda resource to connect to our API Gateway to kick
        // off our step function
        const sagaLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'sagaLambdaHandler', {
            runtime: lambda.Runtime.NODEJS_16_X,
            entry: path_1.join('lambdas', 'sagaLambda.ts'),
            bundling: {
                externalModules: ['aws-sdk'],
            },
            environment: {
                statemachine_arn: saga.stateMachineArn
            },
        });
        saga.grantStartExecution(sagaLambda);
        /**
         * Simple API Gateway proxy integration
         */
        new apigw.LambdaRestApi(this, 'ServerlessSagaPattern', {
            handler: sagaLambda
        });
    }
    /**
     * Utility method to create Lambda blueprint
     * @param scope
     * @param id
     * @param handler
     * @param table
     */
    createLambda(scope, id, handler, table) {
        const fn = new aws_lambda_nodejs_1.NodejsFunction(scope, id, {
            runtime: lambda.Runtime.NODEJS_16_X,
            entry: path_1.join('lambdas', handler),
            bundling: {
                externalModules: ['aws-sdk'],
            },
            environment: {
                TABLE_NAME: table.tableName
            },
        });
        // Give Lambda permissions to read and write data from the DynamoDB table
        table.grantReadWriteData(fn);
        return fn;
    }
}
exports.StateMachine = StateMachine;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGVNYWNoaW5lLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vbGliL3N0YXRlTWFjaGluZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwyQ0FBdUM7QUFDdkMsNkNBQTRDO0FBQzVDLGlEQUFpRDtBQUNqRCxxRUFBK0Q7QUFDL0QscURBQXFEO0FBQ3JELDZEQUE2RDtBQUM3RCwyQ0FBMkM7QUFDM0MsbUVBQW1FO0FBQ25FLHFEQUFxRDtBQUNyRCxvREFBb0Q7QUFDcEQsK0JBQTRCO0FBRTVCLE1BQWEsWUFBYSxTQUFRLHNCQUFTO0lBR3ZDLFlBQVksS0FBZ0IsRUFBRSxFQUFVO1FBQ3RDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakI7O1dBRUc7UUFDSCxNQUFNLFdBQVcsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFDLFNBQVMsRUFBQztZQUNsRCxZQUFZLEVBQUMsRUFBQyxJQUFJLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBQztZQUM1RCxPQUFPLEVBQUMsRUFBQyxJQUFJLEVBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBQztZQUN4RCxhQUFhLEVBQUUsMkJBQWEsQ0FBQyxPQUFPO1NBQ3JDLENBQUMsQ0FBQTtRQUVGLE1BQU0sV0FBVyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUMsU0FBUyxFQUFDO1lBQ3BELFlBQVksRUFBQyxFQUFDLElBQUksRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFDO1lBQzVELE9BQU8sRUFBQyxFQUFDLElBQUksRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFDO1lBQ3hELGFBQWEsRUFBRSwyQkFBYSxDQUFDLE9B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QU8sQ0FBQztZQUMvQixRQUFRLEVBQUU7Z0JBQ04sZUFBZSxFQUFFLENBQUMsU0FBUyxDQUFDO2FBQy9CO1lBQ0QsV0FBVyxFQUFFO2dCQUNULFVBQVUsRUFBRSxLQUFLLENBQUMsU0FBUzthQUM5QjtTQUNGLENBQUMsQ0FBQztRQUVILHlFQUF5RTtRQUN6RSxLQUFLLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFN0IsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDO0NBQ047QUFyTkgsb0NBcU5HIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCB7IFJlbW92YWxQb2xpY3kgfSBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWxhbWJkYVwiO1xuaW1wb3J0IHsgTm9kZWpzRnVuY3Rpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqcyc7XG5pbXBvcnQgKiBhcyBzZm4gZnJvbSBcImF3cy1jZGstbGliL2F3cy1zdGVwZnVuY3Rpb25zXCI7XG5pbXBvcnQgKiBhcyB0YXNrcyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXN0ZXBmdW5jdGlvbnMtdGFza3NcIjtcbmltcG9ydCAqIGFzIHNucyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNuc1wiO1xuaW1wb3J0ICogYXMgc3Vic2NyaXB0aW9ucyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNucy1zdWJzY3JpcHRpb25zXCI7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiXCI7XG5pbXBvcnQgKiBhcyBhcGlndyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXlcIjtcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcblxuZXhwb3J0IGNsYXNzIFN0YXRlTWFjaGluZSBleHRlbmRzIENvbnN0cnVjdCB7XG4gICAgcHVibGljIE1hY2hpbmU6IHNmbi5TdGF0ZU1hY2hpbmU7XG4gIFxuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcpIHtcbiAgICAgIHN1cGVyKHNjb3BlLCBpZCk7XG4gIFxuICAgICAgLyoqXG4gICAgICAgKiBDcmVhdGUgRHluYW1vIERCIHRhYmxlcyB3aGljaCBob2xkcyBmbGlnaHRzIGFuZCBjYXIgcmVudGFscyByZXNlcnZhdGlvbnMgYXMgd2VsbCBhcyBwYXltZW50cyBpbmZvcm1hdGlvblxuICAgICAgICovXG4gICAgICBjb25zdCBmbGlnaHRUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCdGbGlnaHRzJyx7XG4gICAgICAgICAgcGFydGl0aW9uS2V5OntuYW1lOidwaycsIHR5cGU6ZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkd9LFxuICAgICAgICAgIHNvcnRLZXk6e25hbWU6J3NrJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkd9LFxuICAgICAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgICAgfSlcbiAgXG4gICAgICAgIGNvbnN0IHJlbnRhbFRhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsJ1JlbnRhbHMnLHtcbiAgICAgICAgICBwYXJ0aXRpb25LZXk6e25hbWU6J3BrJywgdHlwZTpkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR30sXG4gICAgICAgICAgc29ydEtleTp7bmFtZTonc2snLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklOR30sXG4gICAgICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgICB9KVxuICBcbiAgICAgICAgY29uc3QgcGF5bWVudFRhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsJ1BheW1lbnRzJyx7XG4gICAgICAgICAgcGFydGl0aW9uS2V5OntuYW1lOidwaycsIHR5cGU6ZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkd9LFxuICAgICAgICAgIHNvcnRLZXk6e25hbWU6J3NrJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkd9LFxuICAgICAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgICAgfSlcbiAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZSBMYW1iZGEgRnVuY3Rpb25zIGZvciBib29raW5nIGFuZCBjYW5jZWxsYXRpb24gb2Ygc2VydmljZXMuXG4gICAgICAgICAqL1xuICAgIFxuICAgICAgICAgLy8gRmxpZ2h0cyBcbiAgICAgICAgbGV0IHJlc2VydmVGbGlnaHRMYW1iZGEgPSB0aGlzLmNyZWF0ZUxhbWJkYSh0aGlzLCAncmVzZXJ2ZUZsaWdodExhbWJkYUhhbmRsZXInLCAnZmxpZ2h0cy9yZXNlcnZlRmxpZ2h0LnRzJywgZmxpZ2h0VGFibGUpO1xuICAgICAgICBsZXQgY29uZmlybUZsaWdodExhbWJkYSA9IHRoaXMuY3JlYXRlTGFtYmRhKHRoaXMsICdjb25maXJtRmxpZ2h0TGFtYmRhSGFuZGxlcicsICdmbGlnaHRzL2NvbmZpcm1GbGlnaHQudHMnLCBmbGlnaHRUYWJsZSk7XG4gICAgICAgIGxldCBjYW5jZWxGbGlnaHRMYW1iZGEgPSB0aGlzLmNyZWF0ZUxhbWJkYSh0aGlzLCAnY2FuY2VsRmxpZ2h0TGFtYmRhSGFuZGxlcicsICdmbGlnaHRzL2NhbmNlbEZsaWdodC50cycsIGZsaWdodFRhYmxlKTtcbiAgICBcbiAgICAgICAgLy8gQ2FyIFJlbnRhbHMgXG4gICAgICAgIGxldCByZXNlcnZlUmVudGFsTGFtYmRhID0gdGhpcy5jcmVhdGVMYW1iZGEodGhpcywgJ3Jlc2VydmVSZW50YWxMYW1iZGFIYW5kbGVyJywgJ3JlbnRhbHMvcmVzZXJ2ZVJlbnRhbC50cycsIHJlbnRhbFRhYmxlKTtcbiAgICAgICAgbGV0IGNvbmZpcm1SZW50YWxMYW1iZGEgPSB0aGlzLmNyZWF0ZUxhbWJkYSh0aGlzLCAnY29uZmlybVJlbnRhbExhbWJkYUhhbmRsZXInLCAncmVudGFscy9jb25maXJtUmVudGFsLnRzJywgcmVudGFsVGFibGUpO1xuICAgICAgICBsZXQgY2FuY2VsUmVudGFsTGFtYmRhID0gdGhpcy5jcmVhdGVMYW1iZGEodGhpcywgJ2NhbmNlbFJlbnRhbExhbWJkYUhhbmRsZXInLCAncmVudGFscy9jYW5jZWxSZW50YWwudHMnLCByZW50YWxUYWJsZSk7XG4gICAgXG4gICAgICAgIC8vIFBheW1lbnQgXG4gICAgICAgIGxldCBwcm9jZXNzUGF5bWVudExhbWJkYSA9IHRoaXMuY3JlYXRlTGFtYmRhKHRoaXMsICdwcm9jZXNzUGF5bWVudExhbWJkYUhhbmRsZXInLCAncGF5bWVudC9wcm9jZXNzUGF5bWVudC50cycsIHBheW1lbnRUYWJsZSk7XG4gICAgICAgIGxldCByZWZ1bmRQYXltZW50TGFtYmRhID0gdGhpcy5jcmVhdGVMYW1iZGEodGhpcywgJ3JlZnVuZFBheW1lbnRMYW1iZGFIYW5kbGVyJywgJ3BheW1lbnQvcmVmdW5kUGF5bWVudC50cycsIHBheW1lbnRUYWJsZSk7XG4gIFxuICAgICAgICAvKipcbiAgICAgICAqIFNhZ2EgUGF0dGVybiBTdGVwRnVuY3Rpb25cbiAgICAgICAqIDEpIFJlc2VydmUgRmxpZ2h0XG4gICAgICAgKiAyKSBSZXNlcnZlIENhciBSZW50YWxcbiAgICAgICAqIDIpIFRha2UgUGF5bWVudFxuICAgICAgICogMykgQ29uZmlybSBGbGlnaHQgYW5kIENhciBSZW50YWwgcmVzZXJ2YXRpb25cbiAgICAgICAqL1xuICBcbiAgICAgIFxuICBcbiAgICAgIC8vIGZpbmFsIHN0YXRlcyAtIHN1Y2Nlc3Mgb3IgZmFpbHVyZSBcbiAgICAgIGNvbnN0IHJlc2VydmF0aW9uRmFpbGVkID0gbmV3IHNmbi5GYWlsKHRoaXMsIFwiUmVzZXJ2YXRpb24gRmFpbGVkXCIsIHtlcnJvcjogJ0pvYiBGYWlsZWQnfSk7XG4gICAgICBjb25zdCByZXNlcnZhdGlvblN1Y2NlZWRlZCA9IG5ldyBzZm4uU3VjY2VlZCh0aGlzLCBcIlJlc2VydmF0aW9uIFN1Y2Nlc3NmdWwhXCIpO1xuICAgICAgXG4gICAgICAvLyBTTlMgVG9waWMsIFN1YnNjcmlwdGlvbiBjb25maWd1cmF0aW9uXG4gIFxuICAgICAgY29uc3QgdG9waWMgPSBuZXcgIHNucy5Ub3BpYyh0aGlzLCAnVG9waWMnKTtcbiAgICAgIHRvcGljLmFkZFN1YnNjcmlwdGlvbihuZXcgc3Vic2NyaXB0aW9ucy5TbXNTdWJzY3JpcHRpb24oJysxMTExMTExMTExMScpKTtcbiAgICAgIGNvbnN0IHNuc05vdGlmaWNhdGlvbkZhaWx1cmUgPSBuZXcgdGFza3MuU25zUHVibGlzaCh0aGlzICwnU2VuZGluZ1NNU0ZhaWx1cmUnLCB7XG4gICAgICAgIHRvcGljOnRvcGljLFxuICAgICAgICBpbnRlZ3JhdGlvblBhdHRlcm46IHNmbi5JbnRlZ3JhdGlvblBhdHRlcm4uUkVRVUVTVF9SRVNQT05TRSxcbiAgICAgICAgbWVzc2FnZTogc2ZuLlRhc2tJbnB1dC5mcm9tVGV4dCgnWW91ciBUcmF2ZWwgUmVzZXJ2YXRpb24gRmFpbGVkJyksXG4gICAgICB9KTtcbiAgXG4gICAgICBjb25zdCBzbnNOb3RpZmljYXRpb25TdWNjZXNzID0gbmV3IHRhc2tzLlNuc1B1Ymxpc2godGhpcyAsJ1NlbmRpbmdTTVNTdWNjZXNzJywge1xuICAgICAgICB0b3BpYzp0b3BpYyxcbiAgICAgICAgaW50ZWdyYXRpb25QYXR0ZXJuOiBzZm4uSW50ZWdyYXRpb25QYXR0ZXJuLlJFUVVFU1RfUkVTUE9OU0UsXG4gICAgICAgIG1lc3NhZ2U6IHNmbi5UYXNrSW5wdXQuZnJvbVRleHQoJ1lvdXIgVHJhdmVsIFJlc2VydmF0aW9uIGlzIFN1Y2Nlc3NmdWwnKSxcbiAgICAgIH0pO1xuICBcbiAgXG4gICAgICAvKipcbiAgICAgICAqIFJlc2VydmUgRmxpZ2h0cyBcbiAgICAgICAqL1xuICAgICAgXG4gICAgICBjb25zdCBjYW5jZWxGbGlnaHRSZXNlcnZhdGlvbiA9IG5ldyB0YXNrcy5MYW1iZGFJbnZva2UodGhpcywgJ0NhbmNlbEZsaWdodFJlc2VydmF0aW9uJywge1xuICAgICAgICAgIGxhbWJkYUZ1bmN0aW9uOiBjYW5jZWxGbGlnaHRMYW1iZGEsXG4gICAgICAgICAgcmVzdWx0UGF0aDogJyQuQ2FuY2VsRmxpZ2h0UmVzZXJ2YXRpb25SZXN1bHQnLFxuICAgICAgICB9KS5hZGRSZXRyeSh7bWF4QXR0ZW1wdHM6M30pXG4gICAgICAgIC5uZXh0KHNuc05vdGlmaWNhdGlvbkZhaWx1cmUpIC8vIHJldHJ5IHRoaXMgdGFzayBhIG1heCBvZiAzIHRpbWVzIGlmIGl0IGZhaWxzXG4gICAgICAgIC5uZXh0KHJlc2VydmF0aW9uRmFpbGVkKTtcbiAgICBcbiAgICAgICAgY29uc3QgcmVzZXJ2ZUZsaWdodCA9IG5ldyB0YXNrcy5MYW1iZGFJbnZva2UodGhpcywgJ1Jlc2VydmVGbGlnaHQnLCB7XG4gICAgICAgICAgbGFtYmRhRnVuY3Rpb246IHJlc2VydmVGbGlnaHRMYW1iZGEsXG4gICAgICAgICAgcmVzdWx0UGF0aDogJyQuUmVzZXJ2ZUZsaWdodFJlc3VsdCcsXG4gICAgICAgIH0pLmFkZENhdGNoKGNhbmNlbEZsaWdodFJlc2VydmF0aW9uLCB7XG4gICAgICAgICAgcmVzdWx0UGF0aDogXCIkLlJlc2VydmVGbGlnaHRFcnJvclwiXG4gICAgICAgIH0pO1xuICBcbiAgICAgICAgLyoqXG4gICAgICAgKiBSZXNlcnZlIENhciBSZW50YWxzXG4gICAgICAgKi9cbiAgICAgIFxuICAgICAgY29uc3QgY2FuY2VsUmVudGFsUmVzZXJ2YXRpb24gPSBuZXcgdGFza3MuTGFtYmRhSW52b2tlKHRoaXMsICdDYW5jZWxSZW50YWxSZXNlcnZhdGlvbicsIHtcbiAgICAgICAgICBsYW1iZGFGdW5jdGlvbjpjYW5jZWxSZW50YWxMYW1iZGEsXG4gICAgICAgICAgcmVzdWx0UGF0aDogJyQuQ2FuY2VsUmVudGFsUmVzZXJ2YXRpb25SZXN1bHQnLFxuICAgICAgICB9KS5hZGRSZXRyeSh7bWF4QXR0ZW1wdHM6M30pIC8vIHJldHJ5IHRoaXMgdGFzayBhIG1heCBvZiAzIHRpbWVzIGlmIGl0IGZhaWxzXG4gICAgICAgIC5uZXh0KGNhbmNlbEZsaWdodFJlc2VydmF0aW9uKTtcbiAgICBcbiAgICAgICAgY29uc3QgcmVzZXJ2ZUNhclJlbnRhbCA9IG5ldyB0YXNrcy5MYW1iZGFJbnZva2UodGhpcywgJ1Jlc2VydmVDYXJSZW50YWwnLCB7XG4gICAgICAgICAgbGFtYmRhRnVuY3Rpb246cmVzZXJ2ZVJlbnRhbExhbWJkYSxcbiAgICAgICAgICByZXN1bHRQYXRoOiAnJC5SZXNlcnZlQ2FyUmVudGFsUmVzdWx0JyxcbiAgICAgICAgfSkuYWRkQ2F0Y2goY2FuY2VsUmVudGFsUmVzZXJ2YXRpb24sIHtcbiAgICAgICAgICByZXN1bHRQYXRoOiBcIiQuUmVzZXJ2ZUNhclJlbnRhbEVycm9yXCJcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvKipcbiAgICAgICAgICogUGF5bWVudFxuICAgICAgICAgKi9cbiAgICAgICAgY29uc3QgcmVmdW5kUGF5bWVudCA9IG5ldyB0YXNrcy5MYW1iZGFJbnZva2UodGhpcywgJ1JlZnVuZFBheW1lbnQnLCB7XG4gICAgICAgICAgbGFtYmRhRnVuY3Rpb246cmVmdW5kUGF5bWVudExhbWJkYSxcbiAgICAgICAgICByZXN1bHRQYXRoOiAnJC5SZWZ1bmRQYXltZW50UmVzdWx0JyxcbiAgICAgICAgfSkuYWRkUmV0cnkoe21heEF0dGVtcHRzOjN9KSAvLyByZXRyeSB0aGlzIHRhc2sgYSBtYXggb2YgMyB0aW1lcyBpZiBpdCBmYWlsc1xuICAgICAgICAubmV4dChjYW5jZWxSZW50YWxSZXNlcnZhdGlvbik7XG4gICAgXG4gICAgICAgIGNvbnN0IHByb2Nlc3NQYXltZW50ID0gbmV3IHRhc2tzLkxhbWJkYUludm9rZSh0aGlzLCAnUHJvY2Vzc1BheW1lbnQnLCB7XG4gICAgICAgICAgbGFtYmRhRnVuY3Rpb246cHJvY2Vzc1BheW1lbnRMYW1iZGEsXG4gICAgICAgICAgcmVzdWx0UGF0aDogJyQuUHJvY2Vzc1BheW1lbnRSZXN1bHQnLFxuICAgICAgICB9KS5hZGRDYXRjaChyZWZ1bmRQYXltZW50LCB7XG4gICAgICAgICAgcmVzdWx0UGF0aDogXCIkLlByb2Nlc3NQYXltZW50RXJyb3JcIlxuICAgICAgICB9KTtcbiAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbmZpcm0gRmxpZ2h0IGFuZCBDYXIgUmVudGFsIHJlc2VydmF0aW9uXG4gICAgICAgICAqL1xuICAgIFxuICAgICAgICBjb25zdCBjb25maXJtRmxpZ2h0ID0gbmV3IHRhc2tzLkxhbWJkYUludm9rZSh0aGlzLCAnQ29uZmlybUZsaWdodCcsIHtcbiAgICAgICAgICBsYW1iZGFGdW5jdGlvbjpjb25maXJtRmxpZ2h0TGFtYmRhLFxuICAgICAgICAgIHJlc3VsdFBhdGg6ICckLkNvbmZpcm1GbGlnaHRSZXN1bHQnLFxuICAgICAgICB9KS5hZGRDYXRjaChyZWZ1bmRQYXltZW50LCB7XG4gICAgICAgICAgcmVzdWx0UGF0aDogXCIkLkNvbmZpcm1GbGlnaHRFcnJvclwiXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGNvbmZpcm1DYXJSZW50YWwgPSBuZXcgdGFza3MuTGFtYmRhSW52b2tlKHRoaXMsICdDb25maXJtQ2FyUmVudGFsJywge1xuICAgICAgICAgICAgbGFtYmRhRnVuY3Rpb246Y29uZmlybVJlbnRhbExhbWJkYSxcbiAgICAgICAgICAgIHJlc3VsdFBhdGg6ICckLkNvbmZpcm1DYXJSZW50YWxSZXN1bHQnLFxuICAgICAgICAgIH0pLmFkZENhdGNoKHJlZnVuZFBheW1lbnQsIHtcbiAgICAgICAgICAgIHJlc3VsdFBhdGg6IFwiJC5Db25maXJtQ2FyUmVudGFsRXJyb3JcIlxuICAgICAgICAgIH0pO1xuICAgIFxuICAgICAgICAvL1N0ZXAgZnVuY3Rpb24gZGVmaW5pdGlvblxuICAgICAgICBjb25zdCBkZWZpbml0aW9uID0gc2ZuLkNoYWluXG4gICAgICAgIC5zdGFydChyZXNlcnZlRmxpZ2h0KVxuICAgICAgICAubmV4dChyZXNlcnZlQ2FyUmVudGFsKVxuICAgICAgICAubmV4dChwcm9jZXNzUGF5bWVudClcbiAgICAgICAgLm5leHQoY29uZmlybUZsaWdodClcbiAgICAgICAgLm5leHQoY29uZmlybUNhclJlbnRhbClcbiAgICAgICAgLm5leHQoc25zTm90aWZpY2F0aW9uU3VjY2VzcylcbiAgICAgICAgLm5leHQocmVzZXJ2YXRpb25TdWNjZWVkZWQpXG4gICAgXG4gICAgIFxuICAgICAgICBsZXQgc2FnYSA9IG5ldyBzZm4uU3RhdGVNYWNoaW5lKHRoaXMsIFwiU3RhdGVNYWNoaW5lXCIsIHtcbiAgICAgICAgZGVmaW5pdGlvbixcbiAgXG4gICAgICB9KTtcbiAgXG4gICAgICAgIC8vIEFXUyBMYW1iZGEgcmVzb3VyY2UgdG8gY29ubmVjdCB0byBvdXIgQVBJIEdhdGV3YXkgdG8ga2lja1xuICAgICAgICAvLyBvZmYgb3VyIHN0ZXAgZnVuY3Rpb25cbiAgICAgICAgY29uc3Qgc2FnYUxhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnc2FnYUxhbWJkYUhhbmRsZXInLCB7XG4gICAgICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTZfWCxcbiAgICAgICAgICAgIGVudHJ5OiBqb2luKCdsYW1iZGFzJywgJ3NhZ2FMYW1iZGEudHMnKSxcbiAgICAgICAgICAgIGJ1bmRsaW5nOiB7XG4gICAgICAgICAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ2F3cy1zZGsnXSwgLy8gVXNlIHRoZSAnYXdzLXNkaycgYXZhaWxhYmxlIGluIHRoZSBMYW1iZGEgcnVudGltZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgICAgICAgICAgc3RhdGVtYWNoaW5lX2Fybjogc2FnYS5zdGF0ZU1hY2hpbmVBcm5cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSk7XG4gICAgXG4gICAgXG4gICAgICAgIHNhZ2EuZ3JhbnRTdGFydEV4ZWN1dGlvbihzYWdhTGFtYmRhKTtcbiAgICBcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNpbXBsZSBBUEkgR2F0ZXdheSBwcm94eSBpbnRlZ3JhdGlvblxuICAgICAgICAgKi9cbiAgICAgIFxuICAgICAgICBuZXcgYXBpZ3cuTGFtYmRhUmVzdEFwaSh0aGlzLCAnU2VydmVybGVzc1NhZ2FQYXR0ZXJuJywge1xuICAgICAgICAgIGhhbmRsZXI6IHNhZ2FMYW1iZGFcbiAgICAgICAgfSk7XG4gICAgXG4gIFxuICAgIH1cbiAgXG4gICAgICAvKipcbiAgICAgICAqIFV0aWxpdHkgbWV0aG9kIHRvIGNyZWF0ZSBMYW1iZGEgYmx1ZXByaW50XG4gICAgICAgKiBAcGFyYW0gc2NvcGUgXG4gICAgICAgKiBAcGFyYW0gaWQgXG4gICAgICAgKiBAcGFyYW0gaGFuZGxlciBcbiAgICAgICAqIEBwYXJhbSB0YWJsZSBcbiAgICAgICAqL1xuICAgICAgY3JlYXRlTGFtYmRhKHNjb3BlOkNvbnN0cnVjdCwgaWQ6c3RyaW5nLCBoYW5kbGVyOnN0cmluZywgdGFibGU6ZHluYW1vZGIuVGFibGUpe1xuXG4gICAgICAgICAgY29uc3QgZm4gPSBuZXcgTm9kZWpzRnVuY3Rpb24oc2NvcGUsIGlkLCB7XG4gICAgICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTZfWCxcbiAgICAgICAgICAgIGVudHJ5OiBqb2luKCdsYW1iZGFzJywgaGFuZGxlciksXG4gICAgICAgICAgICBidW5kbGluZzoge1xuICAgICAgICAgICAgICAgIGV4dGVybmFsTW9kdWxlczogWydhd3Mtc2RrJ10sIC8vIFVzZSB0aGUgJ2F3cy1zZGsnIGF2YWlsYWJsZSBpbiB0aGUgTGFtYmRhIHJ1bnRpbWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgICAgICAgIFRBQkxFX05BTUU6IHRhYmxlLnRhYmxlTmFtZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9KTtcbiAgICBcbiAgICAgICAgICAvLyBHaXZlIExhbWJkYSBwZXJtaXNzaW9ucyB0byByZWFkIGFuZCB3cml0ZSBkYXRhIGZyb20gdGhlIER5bmFtb0RCIHRhYmxlXG4gICAgICAgICAgdGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGZuKTtcbiAgICAgIFxuICAgICAgICAgIHJldHVybiBmbjtcbiAgICAgICAgfVxuICB9XG4gICJdfQ==