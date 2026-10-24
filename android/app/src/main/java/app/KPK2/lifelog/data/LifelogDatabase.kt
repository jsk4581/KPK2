package app.KPK2.lifelog.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters

@Database(entities = [LifelogItem::class, DeletedItem::class], version = 1, exportSchema = false)
@TypeConverters(Converters::class)
abstract class LifelogDatabase : RoomDatabase() {
    abstract fun lifelogDao(): LifelogDao

    companion object {
        /** File name in the app's private database directory; backup rules exclude it. */
        const val FILE_NAME = "lifelog.db"

        fun open(context: Context): LifelogDatabase =
            Room.databaseBuilder(context.applicationContext, LifelogDatabase::class.java, FILE_NAME).build()
    }
}
