//import * as AWS  from 'aws-sdk'
import { createLogger } from '../utils/logger'
import { TodoItem } from '../models/TodoItem'
//import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { TodoUpdate } from '../models/TodoUpdate'

const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));


const logger = createLogger('ToDoAccess')

const s3 = new AWS.S3({
  signatureVersion: 'v4'
})

export class ToDoAccess {

  constructor(
    private readonly docClient: DocumentClient = new AWS.DynamoDB.DocumentClient(),
    private readonly toDosTable = process.env.TODOS_TABLE,
   //private readonly toDosTableIndex = process.env.TODOS_INDEX,
    private readonly bucketName = process.env.IMAGES_S3_BUCKET,
    private readonly urlExpiration = parseInt(process.env.SIGNED_URL_EXPIRATION)) {
  }

  async getToDosForUser(userId: string): Promise<TodoItem[]> {
    
    logger.info("Get ToDo Items from Database", {"userId": userId});
    
    try{
      const result = await this.docClient
            .query({
                TableName: this.toDosTable,
                KeyConditionExpression: 'userId = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId
                }
            }).promise()
      logger.info("Value of result: ", {"result": result})

      return result.Items as TodoItem[]
      
    }catch (e) {
      logger.info('Error occured in the DB query op', {"e.message": e.message})
    }
    
    //if(!result)
      //logger.info('Database query getToDosForUser success!')
      
    
  }
  
  
  async createTodoForUser(newtodoItem: TodoItem) {
        
    logger.info("Create ToDo Item in Database", {"todoItem": newtodoItem}); 
    
    try{
      await this.docClient.put({
          TableName: this.toDosTable,
          Item: newtodoItem
      }).promise();
    }
    catch(e) {
      logger.info('Error occured while DB PUT', {"e.message": e.message})
    }

  }
  
  
  async updateToDoItemForUser(userId: string, todoId: string, todoUpdate: TodoUpdate): Promise<void>{
    
    logger.info("Update ToDo Item in Database", {"userId": userId, "todoId": todoId});
    
    await this.docClient.update({
      TableName: this.toDosTable,
      Key: {
        'userId': userId,
        'todoId': todoId
      },
      UpdateExpression: 'set #name= :n, #dueDate = :due, #done = :d',
      ExpressionAttributeNames: {
        "#name": "name",
        '#dueDate': 'dueDate',
        '#done': 'done'
      },
      ExpressionAttributeValues: {
        ':n': todoUpdate.name,
        ':due': todoUpdate.dueDate,
        ':d': todoUpdate.done
      }
      }).promise();
    
  }
  
  async deleteTodoItem(userId: string, todoId: string): Promise<void> {
     
    logger.info("Delete ToDo Item from Database", {"userId": userId, "todoId": todoId});
    
        await this.docClient.delete({
            TableName: this.toDosTable,
            Key: {
              'userId': userId,
              'todoId': todoId
            }
        }).promise();

  }
  
  async deleteTodoItemAttachment(todoId: string): Promise<void> {
    
    logger.info("Delete Attachment for ToDo Item", {"bucketName": this.bucketName, "todoId": todoId});
    
    await s3.deleteObject({
        Bucket: this.bucketName,
        Key: todoId
    }).promise()
  }
  
  async createUploadUrl(todoId: string): Promise<string> {
    logger.info("Create Signed Upload Url", {"bucketName": this.bucketName, "todoId": todoId});
    
    const signedUrl =  s3.getSignedUrl('putObject', {
      Bucket: this.bucketName,
      Key: todoId,
      Expires: this.urlExpiration
    })
    
    logger.info("Created Signed Upload Url", {"signedUrl": signedUrl});
    return signedUrl
  }
 
  async updateAttachmentUrl(userId: string, todoId: string, attachmentUrl: string): Promise<void> {
    
    logger.info("Updating attachment Url", {"bucketName": this.bucketName, "todoId": todoId});
    
    try{
    await this.docClient.update({
      TableName: this.toDosTable,
      Key: {
        'userId': userId,
        'todoId': todoId
      },
      UpdateExpression: 'set attachmentUrl = :attachmentUrl',
        ExpressionAttributeValues: {
          ':attachmentUrl': attachmentUrl
        }
      }).promise()
    }catch(e) {
      logger.info('Error occured while updating attachment Url', {"e.message": e.message})
    }
     
  }
  
}

// function createDynamoDBClient() {
//   if (process.env.IS_OFFLINE) {
//     console.log('Creating a local DynamoDB instance')
//     return new XAWS.DynamoDB.DocumentClient({
//       region: 'localhost',
//       endpoint: 'http://localhost:8000'
//     })
//   }

//   return new XAWS.DynamoDB.DocumentClient()
// }


