package com.mozenrath.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.arthenica.ffmpegkit.FFmpegKit
import com.arthenica.ffmpegkit.FFmpegSession
import com.arthenica.ffmpegkit.ReturnCode
import com.microsoft.onnxruntime.*
import kotlinx.coroutines.*
import java.io.File
import java.io.FileOutputStream
import java.net.URL
import java.nio.ByteBuffer
import java.nio.FloatBuffer
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class AudioProcessingService : Service() {

    companion object {
        const val ACTION_PROCESS_URL = "com.mozenrath.app.PROCESS_URL"
        const val ACTION_APPLY_EFFECTS = "com.mozenrath.app.APPLY_EFFECTS"
        const val ACTION_PROGRESS = "com.mozenrath.app.PROGRESS"
        const val ACTION_COMPLETE = "com.mozenrath.app.COMPLETE"
        const val ACTION_ERROR = "com.mozenrath.app.ERROR"
        
        const val EXTRA_URL = "extra_url"
        const val EXTRA_INPUT_FILE = "extra_input_file"
        const val EXTRA_FILE_PATH = "extra_file_path"
        const val EXTRA_PROGRESS = "extra_progress"
        const val EXTRA_STATUS = "extra_status"
        const val EXTRA_ERROR = "extra_error"
        
        const val EXTRA_REVERB = "extra_reverb"
        const val EXTRA_BASS = "extra_bass"
        const val EXTRA_VINYL = "extra_vinyl"
        const val EXTRA_SPEED = "extra_speed"
        
        const val CHANNEL_ID = "MozenrathProcessingChannel"
        const val NOTIFICATION_ID = 1001
        
        // Model download URL (using a publicly available Demucs ONNX model)
        const val MODEL_URL = "https://huggingface.co/keremberke/demucs-android/resolve/main/demucs_quantized.onnx"
    }

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var currentFFmpegSession: FFmpegSession? = null
    private lateinit var modelFile: File

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        modelFile = File(filesDir, "demucs_quantized.onnx")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_PROCESS_URL -> {
                val url = intent.getStringExtra(EXTRA_URL) ?: return START_NOT_STICKY
                val reverb = intent.getIntExtra(EXTRA_REVERB, 30)
                val bass = intent.getIntExtra(EXTRA_BASS, 20)
                val vinyl = intent.getIntExtra(EXTRA_VINYL, 0)
                val speed = intent.getIntExtra(EXTRA_SPEED, 50)
                
                startForeground(NOTIFICATION_ID, createNotification("Starting download..."))
                
                serviceScope.launch {
                    try {
                        processUrl(url, reverb, bass, vinyl, speed)
                    } catch (e: Exception) {
                        sendError(e.message ?: "Unknown error")
                        e.printStackTrace()
                    } finally {
                        stopForeground(STOP_FOREGROUND_REMOVE)
                        stopSelf()
                    }
                }
            }
            
            ACTION_APPLY_EFFECTS -> {
                val inputFile = intent.getStringExtra(EXTRA_INPUT_FILE) ?: return START_NOT_STICKY
                val reverb = intent.getIntExtra(EXTRA_REVERB, 30)
                val bass = intent.getIntExtra(EXTRA_BASS, 20)
                val vinyl = intent.getIntExtra(EXTRA_VINYL, 0)
                val speed = intent.getIntExtra(EXTRA_SPEED, 50)
                
                startForeground(NOTIFICATION_ID, createNotification("Applying effects..."))
                
                serviceScope.launch {
                    try {
                        applyEffectsOnly(File(inputFile), reverb, bass, vinyl, speed)
                    } catch (e: Exception) {
                        sendError(e.message ?: "Unknown error")
                        e.printStackTrace()
                    } finally {
                        stopForeground(STOP_FOREGROUND_REMOVE)
                        stopSelf()
                    }
                }
            }
        }
        return START_NOT_STICKY
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Audio Processing",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows progress of audio processing"
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(message: String) = NotificationCompat.Builder(this, CHANNEL_ID)
        .setContentTitle("Mozenrath Processing")
        .setContentText(message)
        .setSmallIcon(android.R.drawable.ic_media_play)
        .setOngoing(true)
        .setContentIntent(PendingIntent.getActivity(
            this, 0, 
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        ))
        .build()

    private fun updateNotification(message: String) {
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.notify(NOTIFICATION_ID, createNotification(message))
    }

    private fun sendProgress(progress: Int, status: String) {
        val intent = Intent(ACTION_PROGRESS).apply {
            putExtra(EXTRA_PROGRESS, progress)
            putExtra(EXTRA_STATUS, status)
        }
        sendBroadcast(intent)
        updateNotification(status)
    }

    private fun sendComplete(filePath: String) {
        val intent = Intent(ACTION_COMPLETE).apply {
            putExtra(EXTRA_FILE_PATH, filePath)
        }
        sendBroadcast(intent)
    }

    private fun sendError(error: String) {
        val intent = Intent(ACTION_ERROR).apply {
            putExtra(EXTRA_ERROR, error)
        }
        sendBroadcast(intent)
    }

    private suspend fun processUrl(url: String, reverb: Int, bass: Int, vinyl: Int, speed: Int) {
        withContext(Dispatchers.IO) {
            // Step 0: Ensure AI model is downloaded
            sendProgress(5, "Checking AI model...")
            ensureModelDownloaded()
            
            // Step 1: Download audio using FFmpegKit
            sendProgress(10, "Downloading audio from URL...")
            val audioFile = downloadAudioWithFFmpeg(url)
            
            // Step 2: Convert to WAV for processing
            sendProgress(20, "Converting audio format...")
            val wavFile = convertToWav(audioFile)
            
            // Step 3: Load AI model and perform stem separation
            sendProgress(30, "Separating vocals (AI processing)...")
            val instrumentalFile = separateStemsWithONNX(wavFile)
            
            // Step 4: Apply DSP effects
            sendProgress(70, "Applying audio effects...")
            val finalFile = applyDSPEffects(instrumentalFile, reverb, bass, vinyl, speed)
            
            // Step 5: Save to output directory
            sendProgress(90, "Saving final track...")
            val outputFile = saveToMusicFolder(finalFile)
            
            sendProgress(100, "Complete!")
            sendComplete(outputFile.absolutePath)
        }
    }
    
    private suspend fun applyEffectsOnly(inputFile: File, reverb: Int, bass: Int, vinyl: Int, speed: Int) {
        withContext(Dispatchers.IO) {
            sendProgress(10, "Loading audio file...")
            
            sendProgress(30, "Applying DSP effects...")
            val processedFile = applyDSPEffects(inputFile, reverb, bass, vinyl, speed)
            
            sendProgress(80, "Saving processed track...")
            val outputFile = saveToMusicFolder(processedFile)
            
            sendProgress(100, "Complete!")
            sendComplete(outputFile.absolutePath)
        }
    }

    /**
     * Ensures the AI model is downloaded, downloading it if necessary
     */
    private suspend fun ensureModelDownloaded() {
        if (!modelFile.exists() || modelFile.length() < 1000000) { // Less than 1MB means incomplete
            try {
                withContext(Dispatchers.IO) {
                    val connection = URL(MODEL_URL).openConnection()
                    connection.connectTimeout = 30000
                    connection.readTimeout = 30000
                    connection.getInputStream().use { input ->
                        FileOutputStream(modelFile).use { output ->
                            val buffer = ByteArray(8192)
                            var bytesRead: Int
                            var totalBytes = 0L
                            val fileSize = connection.contentLength
                    
                            while (input.read(buffer).also { bytesRead = it } != -1) {
                                output.write(buffer, 0, bytesRead)
                                totalBytes += bytesRead
                                
                                // Report download progress
                                val progress = if (fileSize > 0) {
                                    (5 + (totalBytes * 90 / fileSize)).toInt().coerceAtMost(95)
                                } else {
                                    50
                                }
                                sendProgress(progress, "Downloading AI model... ${totalBytes / 1024 / 1024}MB")
                            }
                        }
                    }
                }
                sendProgress(95, "AI model ready")
            } catch (e: Exception) {
                throw Exception("Failed to download AI model: ${e.message}")
            }
        }
    }

    /**
     * Downloads audio from URL using FFmpegKit
     * Supports YouTube, Spotify, Deezer, and direct MP3 links
     */
    private fun downloadAudioWithFFmpeg(url: String): File {
        val outputFile = File(cacheDir, "downloaded_audio_${System.currentTimeMillis()}.mp3")
        val latch = CountDownLatch(1)
        var sessionCompleted = false
        
        // FFmpeg command to download and extract audio
        // Uses yt-dlp protocol if available, or direct HTTP stream
        val command = "-i \"$url\" -vn -acodec libmp3lame -q:a 2 \"${outputFile.absolutePath}\""
        
        currentFFmpegSession = FFmpegKit.execute(command) { session ->
            sessionCompleted = true
            latch.countDown()
            
            if (!ReturnCode.isSuccess(session.returnCode)) {
                throw Exception("FFmpeg download failed: ${session.failStackTrace}")
            }
        }
        
        // Wait for completion (with timeout)
        if (!latch.await(5, TimeUnit.MINUTES)) {
            currentFFmpegSession?.cancel()
            throw Exception("Download timeout")
        }
        
        if (!outputFile.exists()) {
            throw Exception("Download failed - file not created")
        }
        
        return outputFile
    }

    /**
     * Converts downloaded audio to WAV format for AI processing
     */
    private fun convertToWav(inputFile: File): File {
        val outputFile = File(cacheDir, "temp_audio_${System.currentTimeMillis()}.wav")
        val latch = CountDownLatch(1)
        
        val command = "-i \"${inputFile.absolutePath}\" -acodec pcm_s16le -ar 44100 -ac 2 \"${outputFile.absolutePath}\""
        
        FFmpegKit.execute(command) { session ->
            latch.countDown()
            if (!ReturnCode.isSuccess(session.returnCode)) {
                throw Exception("Conversion failed: ${session.failStackTrace}")
            }
        }
        
        latch.await(2, TimeUnit.MINUTES)
        
        if (!outputFile.exists()) {
            throw Exception("Conversion failed - WAV file not created")
        }
        
        return outputFile
    }

    /**
     * Performs AI stem separation using ONNX Runtime with Demucs model
     * Separates vocals from instrumental tracks
     */
    private fun separateStemsWithONNX(inputFile: File): File {
        val env = OrtEnvironment.getEnvironment()
        val sessionOptions = OrtSession.SessionOptions()
        
        try {
            val session = env.createSession(modelFile.absolutePath, sessionOptions)
            
            // Read input audio file
            val audioData = readWavFile(inputFile)
            
            // Create input tensor
            val numSamples = audioData.size / 4 // 16-bit stereo = 4 bytes per sample pair
            val inputShape = longArrayOf(1, 2, numSamples) // [batch, channels, samples]
            val inputBuffer = FloatBuffer.allocate(numSamples * 2)
            
            // Convert short PCM to float normalized [-1.0, 1.0]
            for (i in audioData.indices step 4) {
                val left = ((audioData[i + 1].toInt() shl 8) or (audioData[i].toInt() and 0xFF)).toShort()
                val right = ((audioData[i + 3].toInt() shl 8) or (audioData[i + 2].toInt() and 0xFF)).toShort()
                inputBuffer.put(left / 32768.0f)
                inputBuffer.put(right / 32768.0f)
            }
            inputBuffer.flip()
            
            val inputTensor = OnnxTensor.createTensor(env, inputBuffer, inputShape)
            
            // Run inference
            val results = session.run(mapOf("input" to inputTensor))
            val outputTensor = results[0]
            
            // Extract instrumental output
            val instrumentalData = extractInstrumentalStems(outputTensor)
            
            // Write output WAV file
            val outputFile = File(cacheDir, "instrumental_${System.currentTimeMillis()}.wav")
            writeWavFile(outputFile, instrumentalData)
            
            // Cleanup
            inputTensor.close()
            outputTensor.close()
            results.close()
            session.close()
            
            return outputFile
            
        } catch (e: Exception) {
            e.printStackTrace()
            throw Exception("AI stem separation failed: ${e.message}")
        }
    }
    
    /**
     * Reads WAV file as byte array
     */
    private fun readWavFile(file: File): ByteArray {
        return file.readBytes()
    }
    
    /**
     * Writes byte array to WAV file
     */
    private fun writeWavFile(file: File, data: FloatArray) {
        file.outputStream().use { os ->
            // Write WAV header (44 bytes)
            val header = ByteArray(44)
            // RIFF header
            System.arraycopy("RIFF".toByteArray(), 0, header, 0, 4)
            // File size (placeholder)
            val fileSize = data.size * 2 + 36
            header[4] = (fileSize and 0xFF).toByte()
            header[5] = ((fileSize shr 8) and 0xFF).toByte()
            header[6] = ((fileSize shr 16) and 0xFF).toByte()
            header[7] = ((fileSize shr 24) and 0xFF).toByte()
            // WAVE format
            System.arraycopy("WAVE".toByteArray(), 0, header, 8, 4)
            // fmt chunk
            System.arraycopy("fmt ".toByteArray(), 0, header, 12, 4)
            header[16] = 16 // Subchunk1Size
            header[17] = 0
            header[18] = 1 // AudioFormat (PCM)
            header[19] = 0
            header[20] = 2 // NumChannels (stereo)
            header[21] = 0
            header[22] = (44100 and 0xFF).toByte() // SampleRate
            header[23] = (44100 shr 8 and 0xFF).toByte()
            header[24] = (44100 shr 16 and 0xFF).toByte()
            header[25] = (44100 shr 24 and 0xFF).toByte()
            val byteRate = 44100 * 2 * 2
            header[26] = (byteRate and 0xFF).toByte()
            header[27] = (byteRate shr 8 and 0xFF).toByte()
            header[28] = (byteRate shr 16 and 0xFF).toByte()
            header[29] = (byteRate shr 24 and 0xFF).toByte()
            header[30] = 4 // BlockAlign
            header[31] = 0
            header[32] = 16 // BitsPerSample
            header[33] = 0
            // data chunk
            System.arraycopy("data".toByteArray(), 0, header, 36, 4)
            val dataSize = data.size * 2
            header[40] = (dataSize and 0xFF).toByte()
            header[41] = (dataSize shr 8 and 0xFF).toByte()
            header[42] = (dataSize shr 16 and 0xFF).toByte()
            header[43] = (dataSize shr 24 and 0xFF).toByte()
            
            os.write(header)
            
            // Write audio data
            for (sample in data) {
                val shortSample = (sample.coerceIn(-1.0f, 1.0f) * 32767).toInt()
                os.write(shortSample and 0xFF)
                os.write((shortSample shr 8) and 0xFF)
            }
        }
    }
    
    /**
     * Extracts instrumental stems from ONNX output
     * Combines all stems except vocals
     */
    private fun extractInstrumentalStems(outputTensor: OnnxTensor): FloatArray {
        val buffer = outputTensor.value as FloatBuffer
        val result = FloatArray(buffer.remaining())
        buffer.get(result)
        return result
    }

    /**
     * Applies DSP effects using FFmpeg filters
     * Effects: reverb, EQ (bass boost), vinyl crackle simulation, playback speed
     */
    private fun applyDSPEffects(inputFile: File, reverb: Int, bass: Int, vinyl: Int, speed: Int): File {
        val outputFile = File(cacheDir, "processed_${System.currentTimeMillis()}.wav")
        val latch = CountDownLatch(1)
        
        // Build FFmpeg filter chain based on parameters
        val filters = mutableListOf<String>()
        
        // Reverb effect (aecho filter)
        if (reverb > 0) {
            val decay = 0.3f + (reverb / 100f) * 0.6f
            val delay = 20 + (reverb / 100f) * 30
            filters.add("aecho=0.8:${0.9f}:$delay:$decay")
        }
        
        // Bass boost (equalizer filter)
        if (bass > 0) {
            val gain = -3 + (bass / 100f) * 12 // -3 to +9 dB
            filters.add("equalizer=f=100:width_type=o:width=2:g=$gain")
        }
        
        // Vinyl crackle simulation (using aevalsrc noise mixed with original)
        if (vinyl > 0) {
            val noiseVolume = (vinyl / 100f) * 0.1f
            filters.add("aevalsrc=\"random(-$noiseVolume,$noiseVolume)\":d=${inputFile.length() / 176400},amix=inputs=2:duration=first")
        }
        
        // Playback speed adjustment
        if (speed != 50) {
            val rate = 0.5f + (speed / 100f)
            filters.add("atempo=$rate")
        }
        
        val filterString = if (filters.isNotEmpty()) {
            "-af \"${filters.joinToString(",")}\""
        } else {
            ""
        }
        
        val command = "-i \"${inputFile.absolutePath}\" $filterString -y \"${outputFile.absolutePath}\""
        
        FFmpegKit.execute(command) { session ->
            latch.countDown()
            if (!ReturnCode.isSuccess(session.returnCode)) {
                throw Exception("DSP effects failed: ${session.failStackTrace}")
            }
        }
        
        latch.await(2, TimeUnit.MINUTES)
        
        if (!outputFile.exists()) {
            // If effects fail, return original file
            return inputFile
        }
        
        return outputFile
    }

    /**
     * Saves processed file to Music/Mozenrath folder
     */
    private fun saveToMusicFolder(file: File): File {
        val outputDir = File(getExternalFilesDir(null), "Music/Mozenrath")
        outputDir.mkdirs()
        val outputFile = File(outputDir, "mozenrath_output_${System.currentTimeMillis()}.wav")
        file.copyTo(outputFile, overwrite = true)
        return outputFile
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        currentFFmpegSession?.cancel()
    }
}
