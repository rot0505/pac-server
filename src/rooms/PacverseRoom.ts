import { Room, Client, generateId } from "colyseus";
import { ColyseusRoomState, ColyseusNetworkedEntity, ColyseusNetworkedUser } from "./schema/ColyseusRoomState";

const logger = require("../helpers/logger");

export class PacverseRoom extends Room<ColyseusRoomState> {
    clientEntities = new Map<string, string[]>();
    serverTime: number = 0;
    customMethodController: any = null;
    customLogic: any;
    roomOptions: any;

    gameScores: Map<string, number>;
    currentTargetSet: Map<string, any>;
    currentActiveTargets: Map<string, any>;

    /**
     * Getter function to retrieve the correct customLogic file. Will try .JS extension and then .TS
     * @param {*} fileName 
     */
    async getCustomLogic(fileName: string) {
        try {
            this.customMethodController = await import('./customLogic/' + fileName);

        } catch (e) {
            logger.error(e);
        }

        return this.customMethodController;
    }

    /**
     * Callback for the "customMethod" message from the client to run a custom function within the custom logic.
     * Function name is sent from a client.
     * @param {*} client 
     * @param {*} request 
     */
    onCustomMethod(client: Client, request: any) {
        try {
            if (this.customMethodController != null) {
                this.customMethodController.ProcessMethod(this, client, request);

            } else {
                logger.debug("NO Custom Method Logic Set");
            }

        } catch (error) {
            logger.error("Error with custom Method logic: " + error);
        }
    }

    /**
     * Callback for the "entityUpdate" message from the client to update an entity
     * @param {*} clientID 
     * @param {*} data 
     */
    onEntityUpdate(clientID: string, data: any) {

        if (this.state.networkedEntities.has(`${data[0]}`) === false) return;

        let stateToUpdate = this.state.networkedEntities.get(data[0]);

        let startIndex = 1;
        if (data[1] === "attributes") startIndex = 2;

        for (let i = startIndex; i < data.length; i += 2) {
            const property = data[i];
            let updateValue = data[i + 1];
            if (updateValue === "inc") {
                updateValue = data[i + 2];
                updateValue = parseFloat(stateToUpdate.attributes.get(property)) + parseFloat(updateValue);
                i++; // inc i once more since we had a inc;
            }

            if (startIndex == 2) {
                stateToUpdate.attributes.set(property, updateValue.toString());
            } else {
                (stateToUpdate as any)[property] = updateValue;
            }
        }

        stateToUpdate.timestamp = parseFloat(this.serverTime.toString());
    }

    /**
     * Callback for when the room is created
     * @param {*} options The room options sent from the client when creating a room
     */
    async onCreate(options: any) {
        logger.info("*********************** PACVERSE ROOM CREATED ***********************");
        console.log(options);
        logger.info("***********************");

        this.maxClients = 25;
        this.roomOptions = options;

        if (options["roomId"] != null) {
            this.roomId = options["roomId"];
        }

        // Set the room state
        this.setState(new ColyseusRoomState());

        // Set the callback for the "ping" message for tracking server-client latency
        this.onMessage("ping", (client) => {
            client.send(0, { serverTime: this.serverTime });
        });

        // Set the callback for the "customMethod" message
        this.onMessage("customMethod", (client, request) => {
            this.onCustomMethod(client, request);
        });

        // Set the callback for the "entityUpdate" message
        this.onMessage("entityUpdate", (client, entityUpdateArray) => {
            if (this.state.networkedEntities.has(`${entityUpdateArray[0]}`) === false) return;

            this.onEntityUpdate(client.id, entityUpdateArray);
        });

        // Set the callback for the "removeFunctionCall" message
        this.onMessage("remoteFunctionCall", (client, RFCMessage) => {
            //Confirm Sending Client is Owner 
            if (this.state.networkedEntities.has(`${RFCMessage.entityId}`) === false) return;

            RFCMessage.clientId = client.id;

            // Broadcast the "remoteFunctionCall" to all clients except the one the message originated from
            this.broadcast("onRFC", RFCMessage, RFCMessage.target == 0 ? {} : { except: client });
        });

        // Set the callback for the "setAttribute" message to set an entity or user attribute
        this.onMessage("setAttribute", (client, attributeUpdateMessage) => {
            this.setAttribute(client, attributeUpdateMessage);
        });


        // Set the callback for the "removeEntity" message
        this.onMessage("removeEntity", (client, removeId) => {
            if (this.state.networkedEntities.has(removeId)) {
                this.state.networkedEntities.delete(removeId);
            }
        });

        // Set the callback for the "createEntity" message
        this.onMessage("createEntity", (client, creationMessage) => {
            // Generate new UID for the entity
            let entityViewID = generateId();
            let newEntity = new ColyseusNetworkedEntity().assign({
                id: entityViewID,
                ownerId: client.id,
                timestamp: this.serverTime
            });

            if (creationMessage.creationId != null) newEntity.creationId = creationMessage.creationId;

            newEntity.timestamp = parseFloat(this.serverTime.toString());

            for (let key in creationMessage.attributes) {
                if (key === "creationPos") {
                    newEntity.xPos = parseFloat(creationMessage.attributes[key][0]);
                    newEntity.yPos = parseFloat(creationMessage.attributes[key][1]);
                    newEntity.zPos = parseFloat(creationMessage.attributes[key][2]);
                }
                else if (key === "creationRot") {
                    newEntity.xRot = parseFloat(creationMessage.attributes[key][0]);
                    newEntity.yRot = parseFloat(creationMessage.attributes[key][1]);
                    newEntity.zRot = parseFloat(creationMessage.attributes[key][2]);
                    newEntity.wRot = parseFloat(creationMessage.attributes[key][3]);
                }
                else {
                    newEntity.attributes.set(key, creationMessage.attributes[key].toString());
                }
            }

            // Add the entity to the room state's networkedEntities map 
            this.state.networkedEntities.set(entityViewID, newEntity);

            // Add the entity to the client entities collection
            if (this.clientEntities.has(client.id)) {
                this.clientEntities.get(client.id).push(entityViewID);
            } else {
                this.clientEntities.set(client.id, [entityViewID]);
            }

        });

        // Set the frequency of the patch rate
        this.setPatchRate(1000 / 20);

        // Retrieve the custom logic for the room
        const customLogic = await this.getCustomLogic(options["logic"]);

        if (customLogic == null) logger.debug("NO Custom Logic Set");

        try {
            if (customLogic != null)
                customLogic.InitializeLogic(this, options);
        }

        catch (error) {
            logger.error("Error with custom room logic: " + error);
        }

        // Set the Simulation Interval callback
        this.setSimulationInterval(dt => {
            this.serverTime += dt;
            //Run Custom Logic for room if loaded
            try {
                if (customLogic != null)
                    customLogic.ProcessLogic(this, dt);

            } catch (error) {
                logger.error("Error with custom room logic: " + error);
            }

        });

    }

    // Callback when a client has joined the room
    onJoin(client: Client, options: any) {
        logger.info(`Client joined!- ${client.sessionId} ***`);
        console.log('options', options)
        let newNetworkedUser = new ColyseusNetworkedUser().assign({
            id: client.id,
            sessionId: client.sessionId,
            account: options.account,
            userName: options.userName,
            headMat: options.headMat,
            headColor: options.headColor,
            hairMat: options.hairMat,
            hairColor: options.hairColor,
            clothMat: options.clothMat,
            clothColor: options.clothColor,
            shoeMat: options.shoeMat,
            shoeColor: options.shoeColor,
            glassMat: options.glassMat,
            glassColor: options.glassColor,
            maskMat: options.maskMat,
            maskColor: options.maskColor
        });

        var myData = this.state.networkedUsers.toJSON()
        
        for (var key in myData) {
            if (myData.hasOwnProperty(key)) {
                if (myData[key].account === newNetworkedUser.account) {
                    client.send("WalletNotPass", "")
                    return;
                }
            }
        }

        this.state.networkedUsers.set(client.sessionId, newNetworkedUser);

        client.send("onJoin", newNetworkedUser);

        this.onMessage("onChatMsg", (client, chatMsg) => {
            this.broadcast("onChatMsg", chatMsg, { except: client });
        });

        this.onMessage("onFurniture", (client, furniture) => {
            this.broadcast("onFurniture", furniture, { except: client });
        });

        this.onMessage("onDance", (client, dance) => {
            this.broadcast("onDance", dance, { except: client });
        });

        this.onMessage("onGesture", (client, gesture) => {
            this.broadcast("onGesture", gesture, { except: client });
        });
    }

    /**
     * Set the attribute of an entity or a user
     * @param {*} client 
     * @param {*} attributeUpdateMessage 
     */
    setAttribute(client: Client, attributeUpdateMessage: any) {
        if (attributeUpdateMessage == null
            || (attributeUpdateMessage.entityId == null && attributeUpdateMessage.userId == null)
            || attributeUpdateMessage.attributesToSet == null
            // ???
            // || (Object.keys(attributeUpdateMessage.attributesToSet).length === 0 
            //     && obj.constructor === Object)
        ) {
            return; // Invalid Attribute Update Message
        }

        // Set entity attribute
        if (attributeUpdateMessage.entityId) {
            //Check if this client owns the object
            if (this.state.networkedEntities.has(`${attributeUpdateMessage.entityId}`) === false) return;

            this.state.networkedEntities.get(`${attributeUpdateMessage.entityId}`).timestamp = parseFloat(this.serverTime.toString());
            let entityAttributes = this.state.networkedEntities.get(`${attributeUpdateMessage.entityId}`).attributes;
            for (let index = 0; index < Object.keys(attributeUpdateMessage.attributesToSet).length; index++) {
                let key = Object.keys(attributeUpdateMessage.attributesToSet)[index];
                let value = attributeUpdateMessage.attributesToSet[key];
                entityAttributes.set(key, value);
            }
        }
        // Set user attribute
        else if (attributeUpdateMessage.userId) {

            //Check is this client ownes the object
            if (this.state.networkedUsers.has(`${attributeUpdateMessage.userId}`) === false) {
                logger.error(`Set Attribute - User Attribute - Room does not have networked user with Id - \"${attributeUpdateMessage.userId}\"`);
                return;
            }

            this.state.networkedUsers.get(`${attributeUpdateMessage.userId}`).timestamp = parseFloat(this.serverTime.toString());

            let userAttributes = this.state.networkedUsers.get(`${attributeUpdateMessage.userId}`).attributes;

            for (let index = 0; index < Object.keys(attributeUpdateMessage.attributesToSet).length; index++) {
                let key = Object.keys(attributeUpdateMessage.attributesToSet)[index];
                let value = attributeUpdateMessage.attributesToSet[key];
                userAttributes.set(key, value);
            }
        }

    }

    // Callback when a client has left the room
    async onLeave(client: Client, consented: boolean) {
        let networkedUser = this.state.networkedUsers.get(client.sessionId);

        if (networkedUser) {
            networkedUser.connected = false;
        }

        logger.silly(`*** User Leave - ${client.sessionId} ***`);
        // this.clientEntities is keyed by client.id
        // this.state.networkedUsers is keyed by client.sessionid

        try {
            if (consented) {
                throw new Error("consented leave!");
            }

            logger.info("let's wait for reconnection for client: " + client.sessionId);
            const newClient = await this.allowReconnection(client, 10);
            logger.info("reconnected! client: " + newClient.id);

        } catch (e) {
            logger.info("disconnected! client: " + client.id);
            logger.silly(`*** Removing Networked User and Entity ${client.id} ***`);

            //remove user
            this.state.networkedUsers.delete(client.sessionId);

            //remove entites
            if (this.clientEntities.has(client.id)) {
                let allClientEntities = this.clientEntities.get(client.id);
                allClientEntities.forEach(element => {

                    this.state.networkedEntities.delete(element);
                });

                // remove the client from clientEntities
                this.clientEntities.delete(client.id);

                if (this.customMethodController != null) {
                    this.customMethodController.ProcessUserLeft(this);
                }
            }
            else {
                logger.error(`Can't remove entities for ${client.id} - No entry in Client Entities!`);
            }
        }
    }

    onDispose() {
    }
}
