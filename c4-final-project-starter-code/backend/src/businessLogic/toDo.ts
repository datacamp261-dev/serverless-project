import { ToDoAccess } from "../dataLayer/toDoAccess"
import { TodoItem } from '../models/TodoItem'
import {APIGatewayProxyEvent} from 'aws-lambda'
import { createLogger } from '../utils/logger'
import { getUserId } from "../lambda/utils"
import * as uuid from 'uuid';
import { CreateTodoRequest } from "../requests/CreateTodoRequest"
import { UpdateTodoRequest } from "../requests/UpdateTodoRequest"
import { TodoUpdate } from "../models/TodoUpdate"

const toDoAccess = new ToDoAccess()
const logger = createLogger('ToDo')

export async function getAllTodoItems(event: APIGatewayProxyEvent) : Promise<TodoItem[]> {
  
  const userId = getUserId(event);
  
  logger.info('Getting all todo items for user.', {"userId": userId})

  return await toDoAccess.getToDosForUser(userId)
}

export async function createTodoItem(newToDo: CreateTodoRequest, userId: string): Promise<TodoItem> {
  
  logger.info('Create new todo item.', {"userId": userId, "TodoItem": newToDo})
  
  const toDoId = uuid.v4()
  const createdAt = new Date(Date.now()).toISOString()
  
  const newTodoItem: TodoItem = {
    userId: userId,
    todoId: toDoId,
    createdAt: createdAt,
    done: false,
    ...newToDo
  }
  
  await toDoAccess.createTodoForUser(newTodoItem)
  return newTodoItem
}

export async function updateToDoItem(userId: string, todoId: string, updatedTodo: UpdateTodoRequest): Promise<void> {
  
  logger.info('Update item.', {"userId": userId, "todoId": todoId, "updatedTodo": updatedTodo})

  const todoUpdate: TodoUpdate = updatedTodo as TodoUpdate
  
  await toDoAccess.updateToDoItemForUser(userId, todoId, todoUpdate )
}

export async function genUploadUrl(userId: string, todoId: string): Promise<string> {
  
  logger.info('Generate Upload URL and update attachment url for ', {"userId": userId, "TodoId": todoId})

  const signedUploadUrl = await toDoAccess.createUploadUrl(todoId)
  
  const attachmentUrl = signedUploadUrl.split('?')[0]
  
  await toDoAccess.updateAttachmentUrl(userId, todoId, attachmentUrl)
  
  return signedUploadUrl
  
}

export async function deleteToDo(userId: string, todoId: string): Promise<void> {
  
  logger.info('Delete ToDo for ', {"userId": userId, "TodoId": todoId})

  await toDoAccess.deleteTodoItem(userId, todoId)
  
  await toDoAccess.deleteTodoItemAttachment(todoId)
  
}


