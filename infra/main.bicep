targetScope = 'subscription'

@minLength(1)
@description('The azd environment name used to isolate this deployment.')
param environmentName string

@description('The Azure region for all resources in this deployment.')
param location string

var resourceGroupName = 'rg-${environmentName}'

resource resourceGroup 'Microsoft.Resources/resourceGroups@2025-04-01' = {
  name: resourceGroupName
  location: location
  tags: {
    'azd-env-name': environmentName
  }
}

module resources 'resources.bicep' = {
  name: 'token-optimization-simulator-resources'
  scope: resourceGroup
  params: {
    environmentName: environmentName
    location: location
  }
}

output RESOURCE_GROUP_ID string = resourceGroup.id
output AZURE_RESOURCE_GROUP string = resourceGroup.name
output AZURE_LOCATION string = location
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = resources.outputs.AZURE_CONTAINER_REGISTRY_ENDPOINT
output AZURE_CONTAINER_REGISTRY_NAME string = resources.outputs.AZURE_CONTAINER_REGISTRY_NAME
output AZURE_CONTAINER_APPS_ENVIRONMENT_NAME string = resources.outputs.AZURE_CONTAINER_APPS_ENVIRONMENT_NAME
output SERVICE_WEB_NAME string = resources.outputs.SERVICE_WEB_NAME
output SERVICE_WEB_URI string = resources.outputs.SERVICE_WEB_URI