import { Construct } from "constructs";
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
export declare class StateMachine extends Construct {
    Machine: sfn.StateMachine;
    constructor(scope: Construct, id: string);
    /**
     * Utility method to create Lambda blueprint
     * @param scope
     * @param id
     * @param handler
     * @param table
     */
    createLambda(scope: Construct, id: string, handler: string, table: dynamodb.Table): NodejsFunction;
}
