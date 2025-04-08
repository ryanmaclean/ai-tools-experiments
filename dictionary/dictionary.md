# AI and LLM Dictionary for Developers

A comprehensive glossary of key terms, concepts, and acronyms related to artificial intelligence and large language models, with special focus on web application development and infrastructure.

## A

### Activation Function
A mathematical function that determines the output of a neural network node, introducing non-linearity to the model. Common examples include ReLU, Sigmoid, and Tanh.

### Agent
An AI system that can perceive its environment, make decisions, and take actions to achieve specific goals, often incorporating LLMs as reasoning engines.

### Alignment
The process of ensuring AI systems act in accordance with human values, intentions, and expectations. Includes techniques like RLHF and constitutional AI.

### Anthropic
AI safety company founded by former OpenAI researchers that developed the Claude series of large language models.

### Attention Mechanism
A neural network component that allows models to focus on specific parts of input data when producing outputs, forming the foundation of transformer architecture.

### AutoML
Automated Machine Learning. Tools and frameworks that automate the process of applying machine learning to real-world problems, including model selection and hyperparameter tuning.

### AutoRegressive Model
A model that predicts future values based on past values in a sequence, generating each new token based on previously generated ones. LLMs are autoregressive.

## B

### Batch Size
The number of training samples processed in one iteration before model parameters are updated.

### BERT (Bidirectional Encoder Representations from Transformers)
A transformer-based language model designed to understand context from both directions (left and right) in text.

### Bias (Statistical)
Systematic error in model outputs that can reflect societal prejudices or dataset imbalances.

### Bias (Technical)
A learnable parameter in neural networks added to the weighted input before passing through an activation function.

### BPE (Byte Pair Encoding)
A tokenization algorithm that iteratively merges the most frequent pairs of bytes or characters to form new tokens.

## C

### Chain-of-Thought (CoT)
A prompting technique that guides LLMs to show their step-by-step reasoning process before providing a final answer.

### ChatGPT
A conversational AI system developed by OpenAI based on their GPT models, designed for dialogue applications.

### Classification
A supervised learning task where the model predicts which predefined category an input belongs to.

### Claude
A family of large language models developed by Anthropic, designed with a focus on safety and helpfulness.

### Clustering
An unsupervised learning technique that groups similar data points based on certain characteristics.

### CNN (Convolutional Neural Network)
A neural network architecture specialized for processing grid-like data such as images, using convolutional operations.

### Computational Graph
A directed graph representing the flow of computations in a neural network, used for automatic differentiation.

### Context Length
The maximum number of tokens an LLM can process in a single forward pass, determining how much text it can "remember" at once.

### Constitutional AI
An approach to AI alignment that uses a set of principles (a "constitution") to guide model behavior and avoid harmful outputs.

### Cross-Entropy Loss
A common loss function in classification tasks that measures the difference between predicted probability distributions and actual labels.

## D

### Data Augmentation
Techniques to artificially increase training dataset size by creating modified versions of existing data.

### Deep Learning
A subset of machine learning using neural networks with multiple layers (deep neural networks) to learn representations from data.

### Diffusion Models
Generative models that gradually add noise to data and then learn to reverse this process to generate new data samples.

### Distributed Training
Training a model across multiple machines or GPUs to handle large models or datasets.

### Domain Adaptation
Techniques for adapting models trained on one domain to perform well on a different but related domain.

### DPO (Direct Preference Optimization)
A method for training language models directly from human preferences without a separate reward model step.

## E

### Embedding
A dense vector representation of data (words, sentences, images) in a continuous vector space, capturing semantic meaning.

### Ensemble Learning
Combining multiple models to improve overall performance and robustness.

### Epoch
One complete pass through the entire training dataset during the training process.

### Evaluation Metrics
Quantitative measures used to assess model performance, such as accuracy, precision, recall, F1 score, BLEU, or ROUGE.

### Explainable AI (XAI)
AI systems designed to make their functioning and decision-making process transparent and understandable to humans.

## F

### Few-Shot Learning
The ability of a model to learn tasks from a small number of examples, often through in-context learning in LLMs.

### Fine-Tuning
The process of further training a pre-trained model on a specific dataset to adapt it to a particular task or domain.

### Foundational Model
Large AI models trained on vast datasets that can be adapted to a wide range of downstream tasks through fine-tuning.

### Function Calling
A capability allowing LLMs to recognize when they should call external functions and how to format the inputs for those functions.

## G

### GANs (Generative Adversarial Networks)
A framework consisting of two neural networks (generator and discriminator) that compete to generate realistic synthetic data.

### Generalization
A model's ability to perform well on unseen data after training on a specific dataset.

### GPT (Generative Pre-trained Transformer)
A family of autoregressive language models developed by OpenAI that use transformer architecture.

### Gradient Descent
An optimization algorithm that iteratively adjusts model parameters to minimize the loss function.

### GPU (Graphics Processing Unit)
Hardware accelerator commonly used for training and inference in deep learning due to its parallel processing capabilities.

## H

### Hallucination
When an LLM generates information that is factually incorrect or doesn't exist in its training data.

### Hidden Layer
An intermediary layer in a neural network between input and output layers that helps the network learn complex patterns.

### Hyperparameter
Parameters set before training begins (like learning rate or batch size) that govern the training process itself.

## I

### Inference
The process of using a trained model to make predictions on new data.

### Information Retrieval Augmented Generation (RAG)
A technique that enhances LLM responses by retrieving relevant information from external knowledge sources.

### In-Context Learning
The ability of an LLM to learn from examples provided within the prompt without updating model weights.

## J

### JSONL (JSON Lines)
A file format where each line contains a valid JSON object, commonly used for training data in LLM fine-tuning.

## K

### Knowledge Distillation
A process where a smaller model (student) is trained to mimic a larger, more complex model (teacher).

### KV Cache (Key-Value Cache)
An optimization technique in transformer models that stores previously computed key and value tensors to avoid redundant computation.

## L

### Latent Space
The compressed representation space where an encoder maps input data in generative models and embeddings.

### Layer Normalization
A technique used in neural networks to normalize the inputs across features, improving training stability.

### Learning Rate
A hyperparameter that determines how much model parameters are updated during training.

### LLM (Large Language Model)
A neural network with billions of parameters trained on vast text datasets to understand and generate human language.

### LLMOps
Practices and tools for deploying, monitoring, and maintaining LLMs in production environments.

### LORA (Low-Rank Adaptation)
An efficient fine-tuning technique that adapts pre-trained language models by updating a small number of parameters.

### Loss Function
A function that measures the difference between the model's predictions and the true values during training.

## M

### Masked Language Modeling
A pre-training objective where the model predicts words that have been randomly masked in the input text.

### Mixture of Experts (MoE)
A neural network architecture where inputs are routed to different "expert" sub-networks specialized for particular types of inputs.

### Model Compression
Techniques to reduce model size while maintaining performance, including quantization, pruning, and distillation.

### Multi-Head Attention
A mechanism in transformers that allows the model to focus on different positions simultaneously using multiple attention heads.

### Multimodal AI
AI systems capable of processing and generating multiple types of data, such as text, images, audio, and video.

## N

### NER (Named Entity Recognition)
A natural language processing task that identifies and classifies named entities in text into predefined categories.

### Neural Network
A computing system inspired by biological neural networks, consisting of interconnected nodes that process and transmit information.

### Next-Token Prediction
The core task of autoregressive language models, where the model predicts the next token in a sequence given previous tokens.

### NLP (Natural Language Processing)
A field of AI focused on enabling computers to understand, interpret, and generate human language.

## O

### One-Hot Encoding
A representation technique where categorical variables are converted into binary vectors with a single "1" value.

### Optimizer
An algorithm that adjusts model parameters during training to minimize the loss function, such as SGD, Adam, or AdamW.

### Overfitting
When a model performs well on training data but poorly on unseen data due to learning noise or memorizing training examples.

## P

### Parameter-Efficient Fine-Tuning (PEFT)
A collection of methods (like LORA, Prefix Tuning, P-Tuning) that fine-tune large models by updating only a small subset of parameters.

### Perplexity
A measure of how well a language model predicts a sample, calculated as the exponential of the average negative log-likelihood.

### Pipeline
A sequence of processing steps for handling ML tasks, often including data preprocessing, model inference, and post-processing.

### Pooling
An operation that reduces the spatial dimensions of feature maps by combining values in a region, common in CNNs.

### Positional Encoding
A technique in transformers that injects information about token positions into the model since attention lacks inherent position awareness.

### Pre-Training
The initial training phase of a model on a large general dataset before fine-tuning for specific tasks.

### Prompt Engineering
The practice of designing input text (prompts) to effectively guide an LLM to produce desired outputs.

### Pruning
Removing unnecessary connections or neurons from a neural network to reduce its size while maintaining performance.

## Q

### Quantization
A technique that reduces model size and increases inference speed by converting model weights from higher-precision formats (like FP32) to lower-precision formats (like INT8).

### Q-K-V (Query-Key-Value)
The three vector projections used in the attention mechanism of transformer models.

## R

### RAG (Retrieval-Augmented Generation)
A technique combining information retrieval with text generation to produce outputs grounded in retrieved documents or data.

### Recurrent Neural Network (RNN)
A neural network architecture designed for sequential data, where connections between nodes form directed cycles.

### Regularization
Techniques used to prevent overfitting in machine learning models, such as L1/L2 regularization or dropout.

### Reinforcement Learning
A training paradigm where an agent learns to make decisions by receiving rewards or penalties based on its actions.

### RLHF (Reinforcement Learning from Human Feedback)
A training method where human preferences guide model optimization, commonly used for aligning LLMs.

## S

### Self-Attention
A mechanism allowing a model to weigh the importance of different parts of the input when processing a specific element.

### Semantic Search
A search method that understands the intent and contextual meaning of queries rather than just keyword matching.

### Sentiment Analysis
An NLP task that determines the emotional tone or opinion expressed in text.

### Softmax Function
An activation function that converts a vector of numbers into a probability distribution.

### Supervised Learning
A machine learning paradigm where models learn from labeled training data.

## T

### Temperature
A parameter in text generation that controls randomness; higher values produce more diverse outputs while lower values make outputs more deterministic.

### Tensorboard
A visualization toolkit for machine learning experiments, tracking metrics during training.

### Token
The basic unit of text processed by an LLM, which may be a word, subword, character, or byte pattern.

### Top-k Sampling
A text generation strategy that samples from the k most likely next tokens, reducing the chance of generating low-probability tokens.

### Top-p (Nucleus) Sampling
A text generation strategy that samples from the smallest set of tokens whose cumulative probability exceeds threshold p.

### TPU (Tensor Processing Unit)
Google's custom-developed ASICs designed specifically to accelerate machine learning workloads.

### Transfer Learning
Applying knowledge gained from solving one problem to a different but related problem, often by fine-tuning pre-trained models.

### Transformer
A neural network architecture based on self-attention mechanisms, forming the foundation of modern LLMs.

## U

### Unsupervised Learning
A machine learning paradigm where models learn patterns from unlabeled data.

## V

### Validation Set
A subset of data used to provide an unbiased evaluation of model performance during training.

### Vector Database
A specialized database designed to store and efficiently query high-dimensional vector embeddings.

### VRAM (Video RAM)
Memory available on GPUs that limits the size of models that can be trained or run for inference.

## W

### Weight Decay
A regularization technique that prevents model weights from growing too large during training.

### Word Embedding
A learned representation of text where words with similar meanings have similar representations.

## Z

### Zero-Shot Learning
The ability of a model to perform tasks it wasn't explicitly trained on, without any task-specific examples.

## Web Development & Infrastructure

### AI Gateway
A middleware layer that routes API requests to different AI models based on cost, performance, and availability requirements, often providing unified interfaces and fallback mechanisms.

### API Rate Limiting
Restrictions on how many requests can be made to an AI service API within a specified time period, requiring proper throttling and queue management.

### Asynchronous Inference
Processing AI model requests in the background to avoid blocking the main application thread, typically implemented using queues and webhooks.

### Batching
Grouping multiple inference requests together to process them simultaneously, improving throughput and reducing per-request costs.

### CDN Integration
Using Content Delivery Networks to cache AI-generated content or model weights, reducing latency and backend load.

### Containerization
Packaging AI models and their dependencies into containers (like Docker) for consistent deployment across different environments.

### Edge Deployment
Running smaller AI models directly on edge devices or CDN nodes to reduce latency and backend dependencies.

### Embeddings Cache
A storage system that saves previously computed embeddings to reduce computation needs and API costs.

### Failover Strategy
Techniques to maintain service availability when primary AI providers experience outages, including multi-provider setups and fallback models.

### GPU-as-a-Service
Cloud offerings that provide on-demand GPU resources for running AI workloads without managing hardware.

### Infrastructure-as-Code (IaC)
Defining and provisioning AI infrastructure through machine-readable definition files rather than manual processes.

### Kubernetes Orchestration
Using Kubernetes to manage containerized AI workloads, handling scaling, deployment, and resource allocation.

### Latency Optimization
Techniques to reduce the time between sending a request to an AI model and receiving a response, critical for real-time applications.

### Load Balancing
Distributing AI inference requests across multiple servers or service providers to optimize resource utilization and maintain performance.

### Model Caching
Storing model responses or intermediate computations to reduce redundant processing and improve application responsiveness.

### Model Serving
The infrastructure and processes required to make AI models available for inference via APIs or services.

### Monitoring and Observability
Systems for tracking AI model performance, usage patterns, and infrastructure health in production environments.

### Prompt Template Management
Systems for versioning, testing, and deploying prompt templates across different environments in an application.

### Request Streaming
Transmitting AI requests and responses in chunks rather than waiting for complete processing, improving perceived performance.

### Response Streaming
Delivering AI-generated content progressively as it's created rather than waiting for the full response, improving user experience.

### Serverless AI
Running AI workloads in serverless environments where infrastructure management is abstracted away, typically using functions-as-a-service.

### Service Mesh
Network infrastructure layer that handles communication between microservices in distributed AI applications.

### Token Usage Tracking
Monitoring and managing the number of tokens consumed by an application when using commercial AI APIs to control costs.

### Vector Database Integration
Connecting vector databases (like Pinecone, Milvus, or Weaviate) with web applications for semantic search and retrieval-augmented generation.

### Webhook Callbacks
Asynchronous notification mechanisms where AI services notify applications when long-running processes are completed.
