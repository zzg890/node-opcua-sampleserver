import * as os from 'os';
import {
  OPCUAServer,
  Variant,
  DataType,
  nodesets,
  VariantArrayType,
  MessageSecurityMode,
  SecurityPolicy,
  AddressSpace,
  Namespace,
  UAObject,
  UADataType,
  UAVariableType,
  UAState,
  StatusCode,
  StatusCodes
} from 'node-opcua';

const store: { [key: string]: Variant } = {}
/**
 * @param {IAddressSpace} addressSpace
 */

function dataTypeStr(dataType: DataType) {
  switch (dataType) {
    case DataType.Boolean: {
      return "Boolean"
    }
    case DataType.Int16:
    case DataType.Int32:
    case DataType.Int64:
      {
        return "Integer"
      }
    case DataType.Float:
    case DataType.Double:
      {
        return DataType.Double

      }
    case DataType.String: {
      return "String"
    }

    default: {
      return ""
    }

  }
}

function addVariable(parent: UAObject, variableName: string, dataType: DataType, initialValue: any) {
  store[variableName] = new Variant({ dataType: dataType, value: initialValue });
  const namespace = parent.namespace;

  namespace.addVariable({
    componentOf: parent,
    nodeId: `s=${variableName}`,
    browseName: variableName,
    minimumSamplingInterval: 500,
    dataType: dataTypeStr(dataType),
    accessLevel: 'CurrentRead | CurrentWrite',
    userAccessLevel: 'CurrentRead | CurrentWrite',

    value: {
      get: () => {
        return store[variableName];
      },

      set: (v, callback) => {
        console.log(`set value ${v.value} to ${variableName}`)
        store[variableName] = v;
        callback(null, StatusCodes.Good);
        return StatusCodes.Good;
      }
    }
  });

}

function addArrayVariable(parent: UAObject, variableName: string, dataType: DataType, initialValues: any[]) {
  store[variableName] = new Variant({ dataType: dataType, value: initialValues, arrayType: VariantArrayType.Array });
  const namespace = parent.namespace;

  namespace.addVariable({
    componentOf: parent,
    nodeId: `s=${variableName}`,
    browseName: variableName,
    minimumSamplingInterval: 500,
    dataType: dataTypeStr(dataType),
    accessLevel: 'CurrentRead | CurrentWrite',
    userAccessLevel: 'CurrentRead | CurrentWrite',

    value: {
      get: () => {
        return store[variableName];
      },

      set: (v, callback) => {
        console.log(`set value ${v.value} to ${variableName}`)
        store[variableName] = v;
        callback(null, StatusCodes.Good);
        return StatusCodes.Good;
      }
    }
  });

}




function constructAddressSpace(addressSpace: AddressSpace) {
  const namespace = addressSpace.getOwnNamespace();


  // we create a new folder under RootFolder
  const myDevice = namespace.addFolder('ObjectsFolder', {
    browseName: 'MyDevice'
  });

  // now let's add first variable in folder
  // the addVariableInFolder
  const variable1 = 10.0;

  namespace.addVariable({
    componentOf: myDevice,
    nodeId: 's=Temperature',
    browseName: 'Temperature',
    dataType: 'Double',
    minimumSamplingInterval: 500,
    accessLevel: 'CurrentRead | CurrentWrite',
    userAccessLevel: 'CurrentRead | CurrentWrite',
    value: {
      get: () => {
        const t = new Date().getMilliseconds();
        const value = variable1 + 10.0 * Math.sin(t);
        return new Variant({ dataType: DataType.Double, value });
      }
    }
  });

  const uaVariable2 = namespace.addVariable({
    componentOf: myDevice,
    browseName: 'MyVariable2',
    dataType: 'String'
  });
  uaVariable2.setValueFromSource({
    dataType: DataType.String,
    value: 'Learn Node-OPCUA ! Read https://leanpub.com/node-opcuabyexample-edition2024'
  });

  const uaVariable3 = namespace.addVariable({
    componentOf: myDevice,
    browseName: 'MyVariable3',
    dataType: 'Double',
    arrayDimensions: [3],
    accessLevel: 'CurrentRead | CurrentWrite',
    userAccessLevel: 'CurrentRead | CurrentWrite',
    valueRank: 1

  });

  uaVariable3.setValueFromSource({
    dataType: DataType.Double,
    arrayType: VariantArrayType.Array,
    value: [1.0, 2.0, 3.0]
  });

  namespace.addVariable({
    componentOf: myDevice,
    nodeId: 'b=1020ffab',
    browseName: 'Percentage Memory Used',
    dataType: 'Double',
    minimumSamplingInterval: 1000,
    value: {
      get: () => {
        // const value = process.memoryUsage().heapUsed / 1000000;
        const percentageMemUsed = 1.0 - (os.freemem() / os.totalmem());
        const value = percentageMemUsed * 100;
        return new Variant({ dataType: DataType.Double, value });
      }
    }
  });



  const simulator = namespace.addFolder('ObjectsFolder', {
    browseName: 'Simulator'
  });


  addVariable(simulator, "Simulator.Default.Device1.FLOAT1", DataType.Double, 1.0);
  addVariable(simulator, "Simulator.Default.Device1.FLOAT2", DataType.Double, 2.0);


  addVariable(simulator, "Simulator.Default.Device1.INT1", DataType.Int32, 1);


  addVariable(simulator, "Simulator.Default.Device1.INT2", DataType.Int32, 2);


  addVariable(simulator, "Simulator.Default.Device1.BOOLEAN1", DataType.Boolean, true);


  addVariable(simulator, "Simulator.Default.Device1.BOOLEAN2", DataType.Boolean, false);


  addVariable(simulator, "Simulator.Default.Device1.STRING1", DataType.String, "StringA");

  addVariable(simulator, "Simulator.Default.Device1.STRING2", DataType.String, "StringB");

  addArrayVariable(simulator, "Simulator.Default.Device1.FLOAT_ARRAY1", DataType.Double, [1.0, 2.0, 3.0]);
  addArrayVariable(simulator, "Simulator.Default.Device1.INT_ARRAY1", DataType.Double, [1, 2, 3]);
  addArrayVariable(simulator, "Simulator.Default.Device1.BOOLEAN_ARRAY1", DataType.Double, [true, false, true]);

}

(async () => {
  try {
    // Let create an instance of OPCUAServer
    const server = new OPCUAServer({
      port: 4334, // the port of the listening socket of the server


      allowAnonymous: true,
      nodeset_filename: [
        nodesets.standard,
        nodesets.di
      ],
      buildInfo: {
        productName: 'Sample NodeOPCUA Server1',

        buildNumber: '7658',
        buildDate: new Date(2024, 1, 26)
      },
      securityPolicies: [SecurityPolicy.None, SecurityPolicy.Basic256Sha256],
    });


    await server.initialize();


    constructAddressSpace(server.engine.addressSpace!);

    // we can now start the server
    await server.start();

    console.log('Server is now listening ... ( press CTRL+C to stop) ');


    server.endpoints[0].endpointDescriptions().forEach((endpoint) => {
      console.log(endpoint.endpointUrl, MessageSecurityMode[endpoint.securityMode], endpoint.securityPolicyUri!.toString().padEnd(60));
      console.log("    ", endpoint.userIdentityTokens!.map((x) => x.policyId!.toString()).join(' '));
    });

    await new Promise((resolve) => process.once('SIGINT', resolve));

    await server.shutdown();
    console.log('server shutdown completed !');
  } catch (err) {
    console.log(err.message);
    process.exit(-1);
  }
})();
