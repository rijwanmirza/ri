#!/bin/bash

# List of files to process
files=$(find ./client/src -type f -name "*.tsx" -o -name "*.ts" | xargs grep -l "apiRequest" | grep -v "queryClient.ts")

# Process each file
for file in $files; do
  echo "Processing $file"
  
  # Replace 'GET' with "GET"
  sed -i "s/apiRequest([^,]*,[[:space:]]*'GET'[[:space:]]*,/apiRequest(\1, \"GET\",/g" "$file"
  
  # Replace 'POST' with "POST"
  sed -i "s/apiRequest([^,]*,[[:space:]]*'POST'[[:space:]]*,/apiRequest(\1, \"POST\",/g" "$file"
  
  # Replace 'PUT' with "PUT"
  sed -i "s/apiRequest([^,]*,[[:space:]]*'PUT'[[:space:]]*,/apiRequest(\1, \"PUT\",/g" "$file"
  
  # Replace 'DELETE' with "DELETE"
  sed -i "s/apiRequest([^,]*,[[:space:]]*'DELETE'[[:space:]]*,/apiRequest(\1, \"DELETE\",/g" "$file"
  
  # Replace 'PATCH' with "PATCH"
  sed -i "s/apiRequest([^,]*,[[:space:]]*'PATCH'[[:space:]]*,/apiRequest(\1, \"PATCH\",/g" "$file"
  
  # Replace apiRequest calls with only 2 arguments (URL and method as string)
  sed -i "s/apiRequest([^,]*,[[:space:]]*'GET'[[:space:]]*)/apiRequest(\1, \"GET\")/g" "$file"
  sed -i "s/apiRequest([^,]*,[[:space:]]*'POST'[[:space:]]*)/apiRequest(\1, \"POST\")/g" "$file"
  sed -i "s/apiRequest([^,]*,[[:space:]]*'PUT'[[:space:]]*)/apiRequest(\1, \"PUT\")/g" "$file"
  sed -i "s/apiRequest([^,]*,[[:space:]]*'DELETE'[[:space:]]*)/apiRequest(\1, \"DELETE\")/g" "$file"
  sed -i "s/apiRequest([^,]*,[[:space:]]*'PATCH'[[:space:]]*)/apiRequest(\1, \"PATCH\")/g" "$file"
done

echo "All files processed. HTTP methods have been standardized."
