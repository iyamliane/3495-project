# Use the official Python image
FROM python:3.11

# Set working directory inside container
WORKDIR /app

# Copy and install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy the rest of the app files
COPY . .

# Expose Flask port
EXPOSE 5003

# Start the Flask app
CMD ["python", "app.py"]
